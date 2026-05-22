"""
ETL service: Extract → Transform → Load for Books, Borrowers, Transactions.

Extract  : read uploaded CSV / XLSX into a pandas DataFrame.
Transform: clean strings, drop duplicates, validate required columns and
           foreign-key references, normalise categories and dates.
Load     : bulk-insert into target tables, skipping rows that already exist
           by natural key (ISBN for books, email for borrowers, unique
           (book_id, borrower_id, borrow_date) for transactions).

Every run is recorded in `etl_logs` with counts and a free-text summary.
"""
from __future__ import annotations

import io
import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session

import models


# ---------- helpers ----------

VALID_ENTITIES = ("books", "borrowers", "transactions")


def _read_dataframe(filename: str, raw: bytes) -> pd.DataFrame:
    """Detect CSV vs XLSX by extension and parse."""
    lower = (filename or "").lower()
    bio = io.BytesIO(raw)
    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        return pd.read_excel(bio)
    # Default: CSV (also handles .tsv if comma sniff falls through)
    bio.seek(0)
    try:
        return pd.read_csv(bio)
    except Exception:
        bio.seek(0)
        return pd.read_csv(bio, sep=None, engine="python")


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _clean_str(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    s = str(v).strip()
    return s or None


def _parse_date(v: Any) -> Optional[datetime]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, datetime):
        return v
    try:
        return pd.to_datetime(v, errors="raise").to_pydatetime()
    except Exception:
        return None


# ---------- result type ----------

@dataclass
class EtlResult:
    log: models.EtlLog
    summary_lines: List[str] = field(default_factory=list)
    sample_failed: List[dict] = field(default_factory=list)


# ---------- entity transformers ----------

REQUIRED = {
    "books":        {"title", "author", "category", "isbn"},
    "borrowers":    {"borrower_name", "email", "phone"},
    "transactions": {"book_id", "borrower_id", "borrow_date"},
}


def _check_required(df: pd.DataFrame, entity: str) -> List[str]:
    missing = REQUIRED[entity] - set(df.columns)
    if missing:
        return [f"Missing required columns: {sorted(missing)}"]
    return []


def _transform_books(df: pd.DataFrame) -> Tuple[List[dict], List[dict]]:
    rows, failed = [], []
    for idx, raw in df.iterrows():
        title    = _clean_str(raw.get("title"))
        author   = _clean_str(raw.get("author"))
        category = _clean_str(raw.get("category"))
        isbn     = _clean_str(raw.get("isbn"))
        status   = _clean_str(raw.get("availability_status")) or "Available"
        if not all([title, author, category, isbn]):
            failed.append({"row": int(idx) + 2, "reason": "Missing required field", "data": raw.to_dict()})
            continue
        # Normalise category: title-case
        category = " ".join(w.capitalize() for w in category.split())
        rows.append({
            "title": title[:255],
            "author": author[:255],
            "category": category[:100],
            "isbn": isbn[:50],
            "availability_status": status[:20],
        })
    return rows, failed


def _transform_borrowers(df: pd.DataFrame) -> Tuple[List[dict], List[dict]]:
    rows, failed = [], []
    seen_emails = set()
    for idx, raw in df.iterrows():
        name  = _clean_str(raw.get("borrower_name"))
        email = _clean_str(raw.get("email"))
        phone = _clean_str(raw.get("phone"))
        if not all([name, email, phone]):
            failed.append({"row": int(idx) + 2, "reason": "Missing required field", "data": raw.to_dict()})
            continue
        email = email.lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            failed.append({"row": int(idx) + 2, "reason": "Invalid email", "data": raw.to_dict()})
            continue
        if email in seen_emails:
            failed.append({"row": int(idx) + 2, "reason": "Duplicate email in file", "data": raw.to_dict()})
            continue
        seen_emails.add(email)
        rows.append({"borrower_name": name[:150], "email": email[:150], "phone": phone[:20]})
    return rows, failed


def _transform_transactions(df: pd.DataFrame, db: Session) -> Tuple[List[dict], List[dict]]:
    # Pre-load valid IDs so we can validate FKs without round-tripping per row.
    valid_book_ids     = {r[0] for r in db.query(models.Book.book_id).all()}
    valid_borrower_ids = {r[0] for r in db.query(models.Borrower.borrower_id).all()}

    rows, failed = [], []
    for idx, raw in df.iterrows():
        try:
            book_id     = int(raw.get("book_id"))
            borrower_id = int(raw.get("borrower_id"))
        except (TypeError, ValueError):
            failed.append({"row": int(idx) + 2, "reason": "book_id/borrower_id must be integers", "data": raw.to_dict()})
            continue
        if book_id not in valid_book_ids:
            failed.append({"row": int(idx) + 2, "reason": f"book_id {book_id} not found", "data": raw.to_dict()})
            continue
        if borrower_id not in valid_borrower_ids:
            failed.append({"row": int(idx) + 2, "reason": f"borrower_id {borrower_id} not found", "data": raw.to_dict()})
            continue

        borrow_date = _parse_date(raw.get("borrow_date"))
        if not borrow_date:
            failed.append({"row": int(idx) + 2, "reason": "Invalid borrow_date", "data": raw.to_dict()})
            continue
        due_date    = _parse_date(raw.get("due_date"))
        return_date = _parse_date(raw.get("return_date"))

        # Logical validation: return_date can't precede borrow_date
        if return_date and return_date < borrow_date:
            failed.append({"row": int(idx) + 2, "reason": "return_date earlier than borrow_date", "data": raw.to_dict()})
            continue

        try:
            fine_amount = float(raw.get("fine_amount") or 0)
        except (TypeError, ValueError):
            fine_amount = 0.0

        rows.append({
            "book_id": book_id,
            "borrower_id": borrower_id,
            "borrow_date": borrow_date,
            "due_date": due_date,
            "return_date": return_date,
            "fine_amount": fine_amount,
        })
    return rows, failed


# ---------- loader ----------

def _load_books(db: Session, rows: List[dict]) -> int:
    existing = {b.isbn for b in db.query(models.Book.isbn).all()}
    loaded = 0
    for r in rows:
        if r["isbn"] in existing:
            continue
        db.add(models.Book(**r))
        existing.add(r["isbn"])
        loaded += 1
    db.commit()
    return loaded


def _load_borrowers(db: Session, rows: List[dict]) -> int:
    existing = {b.email for b in db.query(models.Borrower.email).all()}
    loaded = 0
    for r in rows:
        if r["email"] in existing:
            continue
        db.add(models.Borrower(**r))
        existing.add(r["email"])
        loaded += 1
    db.commit()
    return loaded


def _load_transactions(db: Session, rows: List[dict]) -> int:
    """Insert transactions, then backfill matching Fine rows for any rows that
    were already late on arrival (fine_amount > 0 + return_date set). This
    keeps the Fines page in sync with imported historical data."""
    # Natural key: (book_id, borrower_id, borrow_date)
    existing = {
        (t.book_id, t.borrower_id, t.borrow_date)
        for t in db.query(models.Transaction.book_id, models.Transaction.borrower_id, models.Transaction.borrow_date).all()
    }
    new_txns: List[models.Transaction] = []
    for r in rows:
        key = (r["book_id"], r["borrower_id"], r["borrow_date"])
        if key in existing:
            continue
        txn = models.Transaction(**r)
        db.add(txn)
        existing.add(key)
        new_txns.append(txn)
    db.flush()  # populate transaction_id on each new row

    # Backfill Fine records for historical overdue returns
    for txn in new_txns:
        if (txn.fine_amount or 0) > 0 and txn.return_date and txn.due_date:
            days_overdue = max(0, (txn.return_date.date() - txn.due_date.date()).days)
            db.add(models.Fine(
                transaction_id=txn.transaction_id,
                borrower_id=txn.borrower_id,
                amount=txn.fine_amount,
                days_overdue=days_overdue,
                status="unpaid",
            ))

    db.commit()
    return len(new_txns)


# ---------- public entry point ----------

def run_etl(
    db: Session,
    entity: str,
    file_bytes: bytes,
    filename: str,
    user_id: Optional[int] = None,
) -> EtlResult:
    """Run the full ETL pipeline for a single entity & file."""
    if entity not in VALID_ENTITIES:
        raise ValueError(f"Unknown entity '{entity}'. Expected one of {VALID_ENTITIES}.")

    started = time.perf_counter()
    summary_lines: List[str] = []
    sample_failed: List[dict] = []
    extracted = transformed = loaded = failed = 0
    status = "ok"
    err_message: Optional[str] = None

    try:
        # ---- EXTRACT
        df = _read_dataframe(filename, file_bytes)
        df = _normalise_columns(df)
        extracted = int(len(df))
        summary_lines.append(f"Extracted {extracted} rows from '{filename}'.")

        # ---- TRANSFORM
        errors = _check_required(df, entity)
        if errors:
            status = "error"
            err_message = "; ".join(errors)
            summary_lines.extend(errors)
        else:
            # Drop fully-duplicate rows up-front
            before = len(df)
            df = df.drop_duplicates()
            dups_in_file = before - len(df)
            if dups_in_file:
                summary_lines.append(f"Removed {dups_in_file} exact-duplicate row(s).")

            if entity == "books":
                rows, failed_rows = _transform_books(df)
            elif entity == "borrowers":
                rows, failed_rows = _transform_borrowers(df)
            else:  # transactions
                rows, failed_rows = _transform_transactions(df, db)

            transformed = len(rows)
            failed = len(failed_rows)
            sample_failed = failed_rows[:25]  # keep payload bounded
            summary_lines.append(f"Transformed {transformed} valid row(s); {failed} failed validation.")

            # ---- LOAD
            if entity == "books":
                loaded = _load_books(db, rows)
            elif entity == "borrowers":
                loaded = _load_borrowers(db, rows)
            else:
                loaded = _load_transactions(db, rows)

            skipped = transformed - loaded
            summary_lines.append(f"Loaded {loaded} new row(s); skipped {skipped} duplicate(s) already in DB.")

            if failed and loaded == 0:
                status = "error"
            elif failed:
                status = "partial"

    except Exception as exc:
        status = "error"
        err_message = f"{type(exc).__name__}: {exc}"
        summary_lines.append(f"ETL aborted: {err_message}")

    duration_ms = int((time.perf_counter() - started) * 1000)

    # ---- LOG
    log = models.EtlLog(
        entity=entity,
        filename=filename,
        extracted=extracted,
        transformed=transformed,
        loaded=loaded,
        failed=failed,
        duration_ms=duration_ms,
        status=status,
        error_message=err_message,
        summary="\n".join(summary_lines)[:2000],
        user_id=user_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return EtlResult(log=log, summary_lines=summary_lines, sample_failed=sample_failed)


# ---------- analytics snapshot (used by ETL post-step) ----------

def snapshot_overdue_report(db: Session, fine_per_day: float = 0.50) -> models.OverdueReport:
    """Compute overdue stats and persist them in `overdue_reports`."""
    now = datetime.utcnow()
    total = db.query(models.Transaction).count()
    overdue_txns = (
        db.query(models.Transaction)
        .filter(models.Transaction.return_date.is_(None))
        .filter(models.Transaction.due_date.isnot(None))
        .filter(models.Transaction.due_date < now)
        .all()
    )
    overdue_count = len(overdue_txns)
    pct = (overdue_count / total * 100.0) if total else 0.0

    days_overdue = [(now - t.due_date).days for t in overdue_txns if t.due_date]
    avg_days = float(sum(days_overdue) / len(days_overdue)) if days_overdue else 0.0
    est_fines = round(sum(d * fine_per_day for d in days_overdue), 2)

    # Frequent overdue borrowers (top 10 by overdue count)
    counts: dict[int, int] = {}
    for t in overdue_txns:
        counts[t.borrower_id] = counts.get(t.borrower_id, 0) + 1
    top_ids = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    id_to_name = {
        b.borrower_id: b.borrower_name
        for b in db.query(models.Borrower).filter(models.Borrower.borrower_id.in_([i for i, _ in top_ids])).all()
    }
    frequent = [
        {"borrower_id": bid, "borrower_name": id_to_name.get(bid, f"#{bid}"), "overdue_count": c}
        for bid, c in top_ids
    ]

    report = models.OverdueReport(
        total_transactions=total,
        overdue_count=overdue_count,
        overdue_percentage=round(pct, 2),
        average_days_overdue=round(avg_days, 2),
        estimated_fines=est_fines,
        details=json.dumps(frequent),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
