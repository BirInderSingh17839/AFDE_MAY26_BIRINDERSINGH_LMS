"""
Reports & exports: CSV, Excel, and PDF.

* CSV  uses Python's stdlib `csv` (zero deps).
* XLSX is built with openpyxl.
* PDF  uses ReportLab.
"""
import csv
import io
import os
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import require_staff
from database import get_db

router = APIRouter(prefix="/reports", tags=["Reports"])

FINE_PER_DAY = float(os.getenv("FINE_PER_DAY", "0.50"))


# ---------- Summary JSON (unchanged) ----------
@router.get("/summary", response_model=schemas.ReportSummary)
def summary(_: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    return crud.report_summary(db)


# ---------- CSV exports ----------
def _csv_response(rows: list[list], header: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/books.csv")
def books_csv(_: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    books = crud.get_books(db, skip=0, limit=10000)
    rows = [[b.book_id, b.title, b.author, b.category, b.isbn, b.availability_status] for b in books]
    return _csv_response(rows, ["book_id", "title", "author", "category", "isbn", "status"], "books.csv")


@router.get("/transactions.csv")
def transactions_csv(_: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    txns = crud.get_transactions(db, skip=0, limit=10000)
    rows = [[
        t.transaction_id,
        t.book.title if t.book else "",
        t.borrower.borrower_name if t.borrower else "",
        t.borrow_date.isoformat() if t.borrow_date else "",
        t.due_date.isoformat() if t.due_date else "",
        t.return_date.isoformat() if t.return_date else "",
        t.fine_amount or 0.0,
    ] for t in txns]
    return _csv_response(rows,
                         ["transaction_id", "book_title", "borrower", "borrow_date", "due_date", "return_date", "fine"],
                         "transactions.csv")


@router.get("/fines.csv")
def fines_csv(_: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    fines = crud.list_fines(db)
    rows = [[
        f.fine_id,
        f.borrower.borrower_name if f.borrower else "",
        f.transaction.book.title if f.transaction and f.transaction.book else "",
        f.amount, f.days_overdue, f.status,
        f.created_at.isoformat() if f.created_at else "",
        f.paid_at.isoformat() if f.paid_at else "",
    ] for f in fines]
    return _csv_response(rows,
                         ["fine_id", "borrower", "book", "amount", "days_overdue", "status", "created_at", "paid_at"],
                         "fines.csv")


# ---------- Excel exports ----------
def _xlsx_response(sheets: dict[str, dict[str, list]], filename: str) -> StreamingResponse:
    """sheets: { sheet_name: { 'headers': [...], 'rows': [[...], ...] } }"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = Workbook()
    wb.remove(wb.active)
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1D4ED8", end_color="1D4ED8", fill_type="solid")
    centered = Alignment(horizontal="left", vertical="center")
    for sheet_name, data in sheets.items():
        ws = wb.create_sheet(title=sheet_name[:31])
        ws.append(data["headers"])
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = centered
        for row in data["rows"]:
            ws.append(row)
        # Auto-size columns (capped)
        for i, col in enumerate(data["headers"], start=1):
            width = max(12, min(48, len(str(col)) + 6))
            ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    return StreamingResponse(
        iter([bio.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/full.xlsx")
def excel_full(_: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    """One multi-sheet Excel workbook with books, transactions, and fines."""
    books = crud.get_books(db, skip=0, limit=10000)
    txns = crud.get_transactions(db, skip=0, limit=10000)
    fines = crud.list_fines(db)
    return _xlsx_response({
        "Books": {
            "headers": ["book_id", "title", "author", "category", "isbn", "status"],
            "rows": [[b.book_id, b.title, b.author, b.category, b.isbn, b.availability_status] for b in books],
        },
        "Transactions": {
            "headers": ["txn_id", "book", "borrower", "borrow_date", "due_date", "return_date", "fine"],
            "rows": [[
                t.transaction_id,
                t.book.title if t.book else "",
                t.borrower.borrower_name if t.borrower else "",
                t.borrow_date.isoformat() if t.borrow_date else "",
                t.due_date.isoformat() if t.due_date else "",
                t.return_date.isoformat() if t.return_date else "",
                t.fine_amount or 0.0,
            ] for t in txns],
        },
        "Fines": {
            "headers": ["fine_id", "borrower", "book", "amount", "days_overdue", "status", "created_at"],
            "rows": [[
                f.fine_id,
                f.borrower.borrower_name if f.borrower else "",
                f.transaction.book.title if f.transaction and f.transaction.book else "",
                f.amount, f.days_overdue, f.status,
                f.created_at.isoformat() if f.created_at else "",
            ] for f in fines],
        },
    }, filename="library_report.xlsx")


# ---------- PDF report ----------
@router.get("/overview.pdf")
def overview_pdf(_: models.User = Depends(require_staff), db: Session = Depends(get_db)):
    """A printable PDF summary with dashboard stats + top tables."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    )

    stats = crud.dashboard_stats(db)
    report = crud.report_summary(db)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm,
                            title="LibraryOS — Report")

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=22, textColor=colors.HexColor("#1D4ED8"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#0F172A"))
    body = styles["BodyText"]
    small = ParagraphStyle("small", parent=body, fontSize=9, textColor=colors.HexColor("#64748B"))

    story = [
        Paragraph("LibraryOS — Operations Report", h1),
        Paragraph(f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", small),
        Spacer(1, 14),

        Paragraph("Dashboard at a glance", h2),
        Table(
            [
                ["Total books",        stats["total_books"]],
                ["Available",          stats["available_books"]],
                ["Currently issued",   stats["borrowed_books"]],
                ["Overdue",            stats["overdue_books"]],
                ["Active users",       stats["active_users"]],
                ["Total transactions", stats["total_transactions"]],
                ["Fines collected",    f"{stats['total_fines_collected']:.2f}"],
                ["Fines outstanding",  f"{stats['total_fines_outstanding']:.2f}"],
            ],
            colWidths=[6 * cm, 4 * cm],
            style=TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]),
        ),
        Spacer(1, 18),

        Paragraph("Most-borrowed books", h2),
        Table(
            [["Title", "Borrows"]] + [[r["title"], r["borrows"]] for r in report["most_borrowed_books"][:10]],
            colWidths=[11 * cm, 3 * cm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]),
        ),
        Spacer(1, 18),

        Paragraph("Top borrowers", h2),
        Table(
            [["Borrower", "Transactions"]] + [[r["borrower_name"], r["transactions"]] for r in report["top_borrowers"][:10]],
            colWidths=[11 * cm, 3 * cm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]),
        ),
        Spacer(1, 18),

        Paragraph("Books by category", h2),
        Table(
            [["Category", "Count"]] + [[r["category"], r["count"]] for r in report["by_category"]],
            colWidths=[11 * cm, 3 * cm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F59E0B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]),
        ),
    ]
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=library_overview.pdf"},
    )
