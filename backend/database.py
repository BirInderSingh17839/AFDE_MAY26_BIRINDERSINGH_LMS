"""
Database connection and session management.

Uses SQLAlchemy ORM with PostgreSQL (default) and falls back to SQLite
for local development if DATABASE_URL is not provided.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to local PostgreSQL; override via DATABASE_URL env var.
# Example PostgreSQL URL: postgresql+psycopg2://user:password@localhost:5432/library_db
# Example SQLite URL:     sqlite:///./library.db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/library_db",
)

# SQLite needs a connect_args tweak; PostgreSQL does not.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
