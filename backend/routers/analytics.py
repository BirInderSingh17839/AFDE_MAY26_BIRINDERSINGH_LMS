"""
Dedicated analytics endpoints (Phase 2).

These are read-only views computed on the live data — fast enough for SQLite
with a few thousand rows. The ETL snapshot writes a frozen version into the
`overdue_reports` table for historical comparison.
"""
import os
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from auth import require_staff
from database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])

FINE_PER_DAY = float(os.getenv("FINE_PER_DAY", "0.50"))


@router.get("/overdue", response_model=schemas.OverdueAnalysis)
def overdue_analysis(db: Session = Depends(get_db), _: models.User = Depends(require_staff)):
    now = datetime.utcnow()
    total = db.query(func.count(models.Transaction.transaction_id)).scalar() or 0
    overdue_q = (
        db.query(models.Transaction)
        .filter(models.Transaction.return_date.is_(None))
        .filter(models.Transaction.due_date.isnot(None))
        .filter(models.Transaction.due_date < now)
    )
    overdue_txns = overdue_q.all()
    overdue_count = len(overdue_txns)
    pct = (overdue_count / total * 100.0) if total else 0.0
    days_overdue = [(now - t.due_date).days for t in overdue_txns if t.due_date]
    avg_days = float(sum(days_overdue) / len(days_overdue)) if days_overdue else 0.0
    est_fines = round(sum(d * FINE_PER_DAY for d in days_overdue), 2)

    counts: dict[int, int] = {}
    for t in overdue_txns:
        counts[t.borrower_id] = counts.get(t.borrower_id, 0) + 1
    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    name_map = {
        b.borrower_id: b.borrower_name
        for b in db.query(models.Borrower).filter(models.Borrower.borrower_id.in_([i for i, _ in top])).all()
    }
    frequent = [
        {"borrower_id": bid, "borrower_name": name_map.get(bid, f"#{bid}"), "overdue_count": c}
        for bid, c in top
    ]

    return {
        "total_transactions": total,
        "overdue_count": overdue_count,
        "overdue_percentage": round(pct, 2),
        "average_days_overdue": round(avg_days, 2),
        "estimated_fines": est_fines,
        "frequent_overdue_borrowers": frequent,
    }


@router.get("/top-books")
def top_books(limit: int = 10, db: Session = Depends(get_db), _: models.User = Depends(require_staff)):
    rows = (
        db.query(models.Book.title, models.Book.author, func.count(models.Transaction.transaction_id))
        .join(models.Transaction, models.Transaction.book_id == models.Book.book_id)
        .group_by(models.Book.book_id, models.Book.title, models.Book.author)
        .order_by(func.count(models.Transaction.transaction_id).desc())
        .limit(limit)
        .all()
    )
    return [{"title": t, "author": a, "borrows": c} for t, a, c in rows]


@router.get("/categories")
def by_category(db: Session = Depends(get_db), _: models.User = Depends(require_staff)):
    rows = (
        db.query(models.Book.category, func.count(models.Transaction.transaction_id))
        .join(models.Transaction, models.Transaction.book_id == models.Book.book_id)
        .group_by(models.Book.category)
        .order_by(func.count(models.Transaction.transaction_id).desc())
        .all()
    )
    return [{"category": c or "Uncategorised", "borrows": n} for c, n in rows]


@router.get("/monthly-trends")
def monthly_trends(db: Session = Depends(get_db), _: models.User = Depends(require_staff)):
    monthly: dict[str, dict[str, int]] = {}
    for t in db.query(models.Transaction).all():
        key = t.borrow_date.strftime("%Y-%m")
        bucket = monthly.setdefault(key, {"borrows": 0, "returns": 0})
        bucket["borrows"] += 1
        if t.return_date:
            rkey = t.return_date.strftime("%Y-%m")
            monthly.setdefault(rkey, {"borrows": 0, "returns": 0})
            monthly[rkey]["returns"] += 1
    return [
        {"month": k, "borrows": v["borrows"], "returns": v["returns"]}
        for k, v in sorted(monthly.items())
    ]


@router.get("/active-users")
def active_users(limit: int = 10, db: Session = Depends(get_db), _: models.User = Depends(require_staff)):
    rows = (
        db.query(models.Borrower.borrower_name, models.Borrower.email, func.count(models.Transaction.transaction_id))
        .join(models.Transaction, models.Transaction.borrower_id == models.Borrower.borrower_id)
        .group_by(models.Borrower.borrower_id, models.Borrower.borrower_name, models.Borrower.email)
        .order_by(func.count(models.Transaction.transaction_id).desc())
        .limit(limit)
        .all()
    )
    return [{"borrower_name": n, "email": e, "transactions": c} for n, e, c in rows]
