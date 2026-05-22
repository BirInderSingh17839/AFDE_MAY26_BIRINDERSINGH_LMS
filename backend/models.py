"""
SQLAlchemy ORM models for the Library Management System.

Phase 2 additions:
  - User (with role: admin / librarian / student)
  - Fine (per overdue return)
  - Notification (in-app alerts)
  - Transaction.due_date and Transaction.fine_amount for overdue tracking
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from database import Base


# ---------- Roles ---------- #
ROLE_ADMIN = "admin"
ROLE_LIBRARIAN = "librarian"
ROLE_STUDENT = "student"
VALID_ROLES = (ROLE_ADMIN, ROLE_LIBRARIAN, ROLE_STUDENT)


class User(Base):
    """Application user. Roles drive permission decisions in the routers."""
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=ROLE_STUDENT, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # Optional linkage: a "student" user can also map to a Borrower record.
    borrower_id = Column(Integer, ForeignKey("borrowers.borrower_id", ondelete="SET NULL"), nullable=True)
    borrower = relationship("Borrower", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Book(Base):
    __tablename__ = "books"
    book_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    isbn = Column(String(50), unique=True, nullable=False)
    availability_status = Column(String(20), nullable=False, default="Available")
    transactions = relationship("Transaction", back_populates="book", cascade="all, delete-orphan")


class Borrower(Base):
    __tablename__ = "borrowers"
    borrower_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    borrower_name = Column(String(150), nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    transactions = relationship("Transaction", back_populates="borrower", cascade="all, delete-orphan")
    fines = relationship("Fine", back_populates="borrower", cascade="all, delete-orphan")
    user = relationship("User", back_populates="borrower", uselist=False)


class Transaction(Base):
    __tablename__ = "transactions"
    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("books.book_id", ondelete="CASCADE"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False)
    borrow_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)          # set on borrow
    return_date = Column(DateTime, nullable=True)       # set on return
    fine_amount = Column(Float, nullable=False, default=0.0)
    book = relationship("Book", back_populates="transactions")
    borrower = relationship("Borrower", back_populates="transactions")
    fine = relationship("Fine", back_populates="transaction", uselist=False, cascade="all, delete-orphan")


class Fine(Base):
    __tablename__ = "fines"
    fine_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.transaction_id", ondelete="CASCADE"), nullable=False, unique=True)
    borrower_id = Column(Integer, ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    days_overdue = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="unpaid", index=True)  # unpaid | paid | waived
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    transaction = relationship("Transaction", back_populates="fine")
    borrower = relationship("Borrower", back_populates="fines")


class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    category = Column(String(30), nullable=False, default="info")  # info | warning | success | overdue | fine
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    user = relationship("User", back_populates="notifications")


# ---------- ETL audit & analytics tables (Phase 2) ----------

class EtlLog(Base):
    """One row per ETL run. Captures counts, status, and a human-readable summary."""
    __tablename__ = "etl_logs"
    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity = Column(String(40), nullable=False, index=True)   # books | borrowers | transactions
    filename = Column(String(255), nullable=True)
    extracted = Column(Integer, nullable=False, default=0)
    transformed = Column(Integer, nullable=False, default=0)
    loaded = Column(Integer, nullable=False, default=0)
    failed = Column(Integer, nullable=False, default=0)
    duration_ms = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="ok", index=True)  # ok | partial | error
    error_message = Column(String(500), nullable=True)
    summary = Column(String(2000), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)


class OverdueReport(Base):
    """Snapshot of overdue analytics produced by the ETL/analytics pipeline."""
    __tablename__ = "overdue_reports"
    report_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    snapshot_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    total_transactions = Column(Integer, nullable=False, default=0)
    overdue_count = Column(Integer, nullable=False, default=0)
    overdue_percentage = Column(Float, nullable=False, default=0.0)
    average_days_overdue = Column(Float, nullable=False, default=0.0)
    estimated_fines = Column(Float, nullable=False, default=0.0)
    details = Column(String(4000), nullable=True)  # JSON-serialised frequent-overdue list


class AnalyticsSummary(Base):
    """Generic key/value analytics rollup, written by the ETL job."""
    __tablename__ = "analytics_summary"
    summary_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    metric = Column(String(80), nullable=False, index=True)
    dimension = Column(String(120), nullable=True, index=True)
    value_numeric = Column(Float, nullable=True)
    value_text = Column(String(200), nullable=True)
    computed_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
