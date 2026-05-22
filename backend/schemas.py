"""
Pydantic request/response schemas.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth / User schemas ---------- #

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=150)
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    """JWT login uses email + password."""
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenWithUser(Token):
    user: "UserOut"


class UserOut(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    borrower_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|librarian|student)$")
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


# ---------- Book schemas ---------- #

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


# ---------- Borrower schemas ---------- #

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


# ---------- Transaction schemas ---------- #

class BorrowRequest(BaseModel):
    book_id: int
    borrower_id: int
    loan_days: Optional[int] = None


class ReturnRequest(BaseModel):
    transaction_id: int


class TransactionOut(BaseModel):
    transaction_id: int
    book_id: int
    borrower_id: int
    borrow_date: datetime
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    fine_amount: float = 0.0
    book_title: Optional[str] = None
    borrower_name: Optional[str] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True


# ---------- Fine schemas ---------- #

class FineOut(BaseModel):
    fine_id: int
    transaction_id: int
    borrower_id: int
    amount: float
    days_overdue: int
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    borrower_name: Optional[str] = None
    book_title: Optional[str] = None

    class Config:
        from_attributes = True


class FinePayRequest(BaseModel):
    fine_id: int


# ---------- Notification schemas ---------- #

class NotificationOut(BaseModel):
    notification_id: int
    user_id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: int
    title: str = Field(..., max_length=150)
    message: str = Field(..., max_length=500)
    category: str = Field(default="info")


# ---------- Dashboard / Reports ---------- #

class DashboardStats(BaseModel):
    total_books: int
    available_books: int
    borrowed_books: int
    overdue_books: int
    total_borrowers: int
    total_users: int
    active_users: int
    total_transactions: int
    total_fines_collected: float
    total_fines_outstanding: float


class CategoryCount(BaseModel):
    category: str
    count: int


class MonthlyActivity(BaseModel):
    month: str
    borrows: int
    returns: int


class ReportSummary(BaseModel):
    by_category: List[CategoryCount]
    monthly_activity: List[MonthlyActivity]
    top_borrowers: List[dict]
    most_borrowed_books: List[dict]


# ---------- Overdue analysis ----------

class OverdueAnalysis(BaseModel):
    total_transactions: int
    overdue_count: int
    overdue_percentage: float
    average_days_overdue: float
    estimated_fines: float
    frequent_overdue_borrowers: List[dict]


# ---------- ETL ----------

class EtlLogOut(BaseModel):
    log_id: int
    entity: str
    filename: Optional[str] = None
    extracted: int
    transformed: int
    loaded: int
    failed: int
    duration_ms: int
    status: str
    error_message: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EtlRunResult(BaseModel):
    log: EtlLogOut
    sample_failed: List[dict] = []
    summary_lines: List[str] = []


# Resolve forward references for nested User models
TokenWithUser.model_rebuild()
