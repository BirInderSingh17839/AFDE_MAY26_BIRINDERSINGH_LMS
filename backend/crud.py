"""
CRUD helper functions — keeps DB-access logic out of the routers.

Phase 2 additions:
  - Loan period & fine policy honoured on borrow / return.
  - Overdue detection + automatic Fine creation on return.
  - Notification creation hooks.
  - Dashboard now reports overdue, active users, fines collected/outstanding.
  - Report aggregations (by category, monthly activity, top borrowers).
"""
import os
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import or_, func, case
from sqlalchemy.orm import Session

import models
import schemas


LOAN_PERIOD_DAYS = int(os.getenv("LOAN_PERIOD_DAYS", "14"))
FINE_PER_DAY = float(os.getenv("FINE_PER_DAY", "0.50"))


# ---------- Book CRUD ----------

def get_books(db: Session, skip: int = 0, limit: int = 200):
    return db.query(models.Book).order_by(models.Book.book_id.desc()).offset(skip).limit(limit).all()


def get_book(db: Session, book_id: int):
    return db.query(models.Book).filter(models.Book.book_id == book_id).first()


def get_book_by_isbn(db: Session, isbn: str):
    return db.query(models.Book).filter(models.Book.isbn == isbn).first()


def create_book(db: Session, book: schemas.BookCreate):
    db_book = models.Book(**book.model_dump())
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book


def update_book(db: Session, book_id: int, book: schemas.BookUpdate):
    db_book = get_book(db, book_id)
    if not db_book:
        return None
    for k, v in book.model_dump(exclude_unset=True).items():
        setattr(db_book, k, v)
    db.commit()
    db.refresh(db_book)
    return db_book


def delete_book(db: Session, book_id: int):
    db_book = get_book(db, book_id)
    if not db_book:
        return False
    db.delete(db_book)
    db.commit()
    return True


def search_books(
    db: Session,
    q: Optional[str] = None,
    title: Optional[str] = None,
    author: Optional[str] = None,
    category: Optional[str] = None,
):
    query = db.query(models.Book)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.Book.title.ilike(like),
                models.Book.author.ilike(like),
                models.Book.category.ilike(like),
                models.Book.isbn.ilike(like),
            )
        )
    if title:
        query = query.filter(models.Book.title.ilike(f"%{title}%"))
    if author:
        query = query.filter(models.Book.author.ilike(f"%{author}%"))
    if category:
        query = query.filter(models.Book.category.ilike(f"%{category}%"))
    return query.order_by(models.Book.title.asc()).all()


# ---------- Borrower CRUD ----------

def get_borrowers(db: Session, skip: int = 0, limit: int = 200):
    return db.query(models.Borrower).order_by(models.Borrower.borrower_id.desc()).offset(skip).limit(limit).all()


def get_borrower(db: Session, borrower_id: int):
    return db.query(models.Borrower).filter(models.Borrower.borrower_id == borrower_id).first()


def get_borrower_by_email(db: Session, email: str):
    return db.query(models.Borrower).filter(models.Borrower.email == email).first()


def create_borrower(db: Session, borrower: schemas.BorrowerCreate):
    db_b = models.Borrower(**borrower.model_dump())
    db.add(db_b)
    db.commit()
    db.refresh(db_b)
    return db_b


def update_borrower(db: Session, borrower_id: int, borrower: schemas.BorrowerUpdate):
    db_b = get_borrower(db, borrower_id)
    if not db_b:
        return None
    for k, v in borrower.model_dump(exclude_unset=True).items():
        setattr(db_b, k, v)
    db.commit()
    db.refresh(db_b)
    return db_b


def delete_borrower(db: Session, borrower_id: int):
    db_b = get_borrower(db, borrower_id)
    if not db_b:
        return False
    db.delete(db_b)
    db.commit()
    return True


# ---------- Transaction CRUD ----------

def borrow_book(db: Session, book_id: int, borrower_id: int, loan_days: Optional[int] = None):
    book = get_book(db, book_id)
    if not book:
        return None, "Book not found"
    if book.availability_status != "Available":
        return None, "Book is not available"
    borrower = get_borrower(db, borrower_id)
    if not borrower:
        return None, "Borrower not found"

    days = loan_days if loan_days and loan_days > 0 else LOAN_PERIOD_DAYS
    now = datetime.utcnow()
    txn = models.Transaction(
        book_id=book_id,
        borrower_id=borrower_id,
        borrow_date=now,
        due_date=now + timedelta(days=days),
        return_date=None,
        fine_amount=0.0,
    )
    book.availability_status = "Borrowed"
    db.add(txn)
    db.commit()
    db.refresh(txn)

    # Notify the linked user if one exists
    linked_user = db.query(models.User).filter(models.User.borrower_id == borrower_id).first()
    if linked_user:
        _notify(db, linked_user.user_id,
                title=f"Book issued: {book.title}",
                message=f"Due back by {txn.due_date.strftime('%Y-%m-%d')}.",
                category="info")
    return txn, None


def return_book(db: Session, transaction_id: int):
    txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == transaction_id).first()
    if not txn:
        return None, "Transaction not found"
    if txn.return_date is not None:
        return None, "Book already returned"

    now = datetime.utcnow()
    txn.return_date = now
    if txn.book:
        txn.book.availability_status = "Available"

    # Compute fine if the return is past the due date
    days_overdue = 0
    if txn.due_date and now > txn.due_date:
        days_overdue = (now.date() - txn.due_date.date()).days
        if days_overdue > 0:
            fine_amount = round(days_overdue * FINE_PER_DAY, 2)
            txn.fine_amount = fine_amount
            fine = models.Fine(
                transaction_id=txn.transaction_id,
                borrower_id=txn.borrower_id,
                amount=fine_amount,
                days_overdue=days_overdue,
                status="unpaid",
            )
            db.add(fine)
            linked_user = db.query(models.User).filter(models.User.borrower_id == txn.borrower_id).first()
            if linked_user:
                _notify(db, linked_user.user_id,
                        title="Fine issued",
                        message=f"Book returned {days_overdue} day(s) late. Fine: {fine_amount}.",
                        category="fine")

    db.commit()
    db.refresh(txn)
    return txn, None


def get_transactions(db: Session, skip: int = 0, limit: int = 200, borrower_id: Optional[int] = None):
    q = db.query(models.Transaction)
    if borrower_id is not None:
        q = q.filter(models.Transaction.borrower_id == borrower_id)
    return q.order_by(models.Transaction.transaction_id.desc()).offset(skip).limit(limit).all()


def serialize_transaction(txn: models.Transaction) -> dict:
    is_overdue = bool(
        txn.return_date is None
        and txn.due_date is not None
        and datetime.utcnow() > txn.due_date
    )
    return {
        "transaction_id": txn.transaction_id,
        "book_id": txn.book_id,
        "borrower_id": txn.borrower_id,
        "borrow_date": txn.borrow_date,
        "due_date": txn.due_date,
        "return_date": txn.return_date,
        "fine_amount": txn.fine_amount or 0.0,
        "book_title": txn.book.title if txn.book else None,
        "borrower_name": txn.borrower.borrower_name if txn.borrower else None,
        "is_overdue": is_overdue,
    }


# ---------- Fines ----------

def list_fines(db: Session, status: Optional[str] = None, borrower_id: Optional[int] = None):
    q = db.query(models.Fine)
    if status:
        q = q.filter(models.Fine.status == status)
    if borrower_id is not None:
        q = q.filter(models.Fine.borrower_id == borrower_id)
    return q.order_by(models.Fine.fine_id.desc()).all()


def serialize_fine(f: models.Fine) -> dict:
    return {
        "fine_id": f.fine_id,
        "transaction_id": f.transaction_id,
        "borrower_id": f.borrower_id,
        "amount": f.amount,
        "days_overdue": f.days_overdue,
        "status": f.status,
        "created_at": f.created_at,
        "paid_at": f.paid_at,
        "borrower_name": f.borrower.borrower_name if f.borrower else None,
        "book_title": f.transaction.book.title if f.transaction and f.transaction.book else None,
    }


def pay_fine(db: Session, fine_id: int):
    f = db.query(models.Fine).filter(models.Fine.fine_id == fine_id).first()
    if not f:
        return None, "Fine not found"
    if f.status == "paid":
        return None, "Fine already paid"
    f.status = "paid"
    f.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(f)
    return f, None


def waive_fine(db: Session, fine_id: int):
    f = db.query(models.Fine).filter(models.Fine.fine_id == fine_id).first()
    if not f:
        return None, "Fine not found"
    if f.status == "paid":
        return None, "Cannot waive a paid fine"
    f.status = "waived"
    f.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(f)
    return f, None


# ---------- Notifications ----------

def _notify(db: Session, user_id: int, title: str, message: str, category: str = "info"):
    n = models.Notification(user_id=user_id, title=title, message=message, category=category)
    db.add(n)
    # Caller is responsible for the surrounding commit; safe to flush though.
    db.flush()
    return n


def list_notifications(db: Session, user_id: int, unread_only: bool = False):
    q = db.query(models.Notification).filter(models.Notification.user_id == user_id)
    if unread_only:
        q = q.filter(models.Notification.is_read == False)  # noqa: E712
    return q.order_by(models.Notification.notification_id.desc()).all()


def mark_notification_read(db: Session, user_id: int, notification_id: int):
    n = (
        db.query(models.Notification)
        .filter(models.Notification.notification_id == notification_id,
                models.Notification.user_id == user_id)
        .first()
    )
    if not n:
        return None
    n.is_read = True
    db.commit()
    return n


def mark_all_notifications_read(db: Session, user_id: int):
    db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()


# ---------- Dashboard ----------

def dashboard_stats(db: Session) -> dict:
    now = datetime.utcnow()
    total_books = db.query(func.count(models.Book.book_id)).scalar() or 0
    available_books = (
        db.query(func.count(models.Book.book_id))
        .filter(models.Book.availability_status == "Available")
        .scalar()
        or 0
    )
    borrowed_books = total_books - available_books
    overdue_books = (
        db.query(func.count(models.Transaction.transaction_id))
        .filter(
            models.Transaction.return_date.is_(None),
            models.Transaction.due_date.isnot(None),
            models.Transaction.due_date < now,
        )
        .scalar()
        or 0
    )
    total_borrowers = db.query(func.count(models.Borrower.borrower_id)).scalar() or 0
    total_users = db.query(func.count(models.User.user_id)).scalar() or 0
    active_users = (
        db.query(func.count(models.User.user_id))
        .filter(models.User.is_active == True)  # noqa: E712
        .scalar()
        or 0
    )
    total_transactions = db.query(func.count(models.Transaction.transaction_id)).scalar() or 0

    fines_collected = (
        db.query(func.coalesce(func.sum(models.Fine.amount), 0.0))
        .filter(models.Fine.status == "paid")
        .scalar()
        or 0.0
    )
    fines_outstanding = (
        db.query(func.coalesce(func.sum(models.Fine.amount), 0.0))
        .filter(models.Fine.status == "unpaid")
        .scalar()
        or 0.0
    )

    return {
        "total_books": total_books,
        "available_books": available_books,
        "borrowed_books": borrowed_books,
        "overdue_books": overdue_books,
        "total_borrowers": total_borrowers,
        "total_users": total_users,
        "active_users": active_users,
        "total_transactions": total_transactions,
        "total_fines_collected": float(fines_collected),
        "total_fines_outstanding": float(fines_outstanding),
    }


# ---------- Reports ----------

def report_summary(db: Session) -> dict:
    # Books by category
    by_category_rows = (
        db.query(models.Book.category, func.count(models.Book.book_id))
        .group_by(models.Book.category)
        .order_by(func.count(models.Book.book_id).desc())
        .all()
    )
    by_category = [{"category": c or "Uncategorised", "count": n} for c, n in by_category_rows]

    # Monthly activity (last 6 months bucket by YYYY-MM)
    monthly = {}
    for t in db.query(models.Transaction).all():
        key = t.borrow_date.strftime("%Y-%m")
        bucket = monthly.setdefault(key, {"borrows": 0, "returns": 0})
        bucket["borrows"] += 1
        if t.return_date:
            rkey = t.return_date.strftime("%Y-%m")
            monthly.setdefault(rkey, {"borrows": 0, "returns": 0})
            monthly[rkey]["returns"] += 1
    monthly_activity = [
        {"month": k, "borrows": v["borrows"], "returns": v["returns"]}
        for k, v in sorted(monthly.items())
    ][-12:]

    # Top borrowers
    top_borrowers_rows = (
        db.query(models.Borrower.borrower_name, func.count(models.Transaction.transaction_id))
        .join(models.Transaction, models.Transaction.borrower_id == models.Borrower.borrower_id)
        .group_by(models.Borrower.borrower_id, models.Borrower.borrower_name)
        .order_by(func.count(models.Transaction.transaction_id).desc())
        .limit(10)
        .all()
    )
    top_borrowers = [{"borrower_name": n, "transactions": c} for n, c in top_borrowers_rows]

    # Most borrowed books
    most_borrowed_rows = (
        db.query(models.Book.title, func.count(models.Transaction.transaction_id))
        .join(models.Transaction, models.Transaction.book_id == models.Book.book_id)
        .group_by(models.Book.book_id, models.Book.title)
        .order_by(func.count(models.Transaction.transaction_id).desc())
        .limit(10)
        .all()
    )
    most_borrowed_books = [{"title": t, "borrows": c} for t, c in most_borrowed_rows]

    return {
        "by_category": by_category,
        "monthly_activity": monthly_activity,
        "top_borrowers": top_borrowers,
        "most_borrowed_books": most_borrowed_books,
    }
