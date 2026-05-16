"""
Pydantic request/response schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ---------- Book schemas ----------

class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    isbn: str = Field(..., min_length=1, max_length=50)
    availability_status: str = Field(default="Available", max_length=20)


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    isbn: Optional[str] = None
    availability_status: Optional[str] = None


class BookOut(BookBase):
    book_id: int

    class Config:
        from_attributes = True


# ---------- Borrower schemas ----------

class BorrowerBase(BaseModel):
    borrower_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=20)


class BorrowerCreate(BorrowerBase):
    pass


class BorrowerUpdate(BaseModel):
    borrower_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class BorrowerOut(BorrowerBase):
    borrower_id: int

    class Config:
        from_attributes = True


# ---------- Transaction schemas ----------

class BorrowRequest(BaseModel):
    book_id: int
    borrower_id: int


class ReturnRequest(BaseModel):
    transaction_id: int


class TransactionOut(BaseModel):
    transaction_id: int
    book_id: int
    borrower_id: int
    borrow_date: datetime
    return_date: Optional[datetime] = None
    book_title: Optional[str] = None
    borrower_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Dashboard / misc ----------

class DashboardStats(BaseModel):
    total_books: int
    available_books: int
    borrowed_books: int
    total_borrowers: int
    total_transactions: int
