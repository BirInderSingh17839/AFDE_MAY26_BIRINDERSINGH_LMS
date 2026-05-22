"""
Database connection and session management.

Default backend is SQLite (file `library.db` in the backend folder). The
SQLite file is auto-created on first startup via `Base.metadata.create_all`.

PostgreSQL remains supported as an optional fallback: set the DATABASE_URL
environment variable to a PostgreSQL connection string (e.g.,
`postgresql+psycopg2://user:password@localhost:5432/library_db`) and install
`psycopg2-binary` (listed as an extra in requirements.txt).
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Resolve the default SQLite path next to this file so it works regardless
# of where uvicorn is launched from.
_DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent / "library.db"
_DEFAULT_SQLITE_URL = f"sqlite:///{_DEFAULT_SQLITE_PATH.as_posix()}"

DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_SQLITE_URL)

IS_SQLITE = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if IS_SQLITE else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
    pool_pre_ping=True,
)

# Enable FK constraints and WAL on SQLite — improves data integrity and
# concurrent-read performance for the dashboard.
if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def _sqlite_pragma(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
