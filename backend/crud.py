"""
CRUD helper functions — keep DB access logic out of the routers.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

import models
import schemas


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

def borrow_book(db: Session, book_id: int, borrower_id: int):
    book = get_book(db, book_id)
    if not book:
        return None, "Book not found"
    if book.availability_status != "Available":
        return None, "Book is not available"
    borrower = get_borrower(db, borrower_id)
    if not borrower:
        return None, "Borrower not found"

    txn = models.Transaction(
        book_id=book_id,
        borrower_id=borrower_id,
        borrow_date=datetime.utcnow(),
        return_date=None,
    )
    book.availability_status = "Borrowed"
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn, None


def return_book(db: Session, transaction_id: int):
    txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == transaction_id).first()
    if not txn:
        return None, "Transaction not found"
    if txn.return_date is not None:
        return None, "Book already returned"
    txn.return_date = datetime.utcnow()
    if txn.book:
        txn.book.availability_status = "Available"
    db.commit()
    db.refresh(txn)
    return txn, None


def get_transactions(db: Session, skip: int = 0, limit: int = 200):
    return (
        db.query(models.Transaction)
        .order_by(models.Transaction.transaction_id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def serialize_transaction(txn: models.Transaction) -> dict:
    return {
        "transaction_id": txn.transaction_id,
        "book_id": txn.book_id,
        "borrower_id": txn.borrower_id,
        "borrow_date": txn.borrow_date,
        "return_date": txn.return_date,
        "book_title": txn.book.title if txn.book else None,
        "borrower_name": txn.borrower.borrower_name if txn.borrower else None,
    }


# ---------- Dashboard ----------

def dashboard_stats(db: Session) -> dict:
    total_books = db.query(func.count(models.Book.book_id)).scalar() or 0
    available_books = (
        db.query(func.count(models.Book.book_id))
        .filter(models.Book.availability_status == "Available")
        .scalar()
        or 0
    )
    borrowed_books = total_books - available_books
    total_borrowers = db.query(func.count(models.Borrower.borrower_id)).scalar() or 0
    total_transactions = db.query(func.count(models.Transaction.transaction_id)).scalar() or 0
    return {
        "total_books": total_books,
        "available_books": available_books,
        "borrowed_books": borrowed_books,
        "total_borrowers": total_borrowers,
        "total_transactions": total_transactions,
    }
