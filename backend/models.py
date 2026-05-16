"""
SQLAlchemy ORM models for the Library Management System.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


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


class Transaction(Base):
    __tablename__ = "transactions"
    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("books.book_id", ondelete="CASCADE"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False)
    borrow_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    return_date = Column(DateTime, nullable=True)
    book = relationship("Book", back_populates="transactions")
    borrower = relationship("Borrower", back_populates="transactions")
