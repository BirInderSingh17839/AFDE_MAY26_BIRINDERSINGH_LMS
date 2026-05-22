"""
FastAPI entrypoint for the Library Management System (Phase 2).

Authentication: JWT bearer tokens. Email-based login.
Database: SQLite by default (auto-created on first run).

Run locally:
    uvicorn main:app --reload --port 8000
"""
import logging
import os

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import crud
from auth import get_current_user, seed_default_users
from database import Base, engine, get_db, SessionLocal, IS_SQLITE
from routers import (
    auth as auth_router,
    books, borrowers, transactions, search,
    fines, notifications, reports, users,
    etl, analytics,
)

# ---------- Logging ----------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=os.getenv("LOG_LEVEL", "INFO"),
)
log = logging.getLogger("library")

# ---------- Database bootstrap ----------
Base.metadata.create_all(bind=engine)
log.info("Database ready (sqlite=%s, url=%s)", IS_SQLITE,
         engine.url.render_as_string(hide_password=True))


def _bootstrap():
    """Seed the three Phase-2 demo accounts (admin/librarian/user)."""
    db = SessionLocal()
    try:
        seed_default_users(db)
        log.info("Seed users ensured: admin@gmail.com / librarian@gmail.com / user@gmail.com")
    except Exception:
        log.exception("Failed to seed default users")
    finally:
        db.close()


_bootstrap()

# ---------- App ----------
app = FastAPI(
    title="Library Management System API",
    description="Phase 2 — JWT auth, ETL pipeline, analytics, reports.",
    version="2.1.0",
)

# CORS — JWT tokens travel in Authorization header, not cookies.
# `allow_credentials` is False here because we don't need cookie pass-through.
allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in allowed.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        if response.status_code >= 400:
            log.warning("%s %s -> %s", request.method, request.url.path, response.status_code)
        return response
    except Exception:
        log.exception("Error handling %s %s", request.method, request.url.path)
        raise


# ---------- Health & dashboard ----------
@app.get("/", tags=["Health"])
def root():
    return {
        "app": "Library Management System",
        "version": "2.1.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health(db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "db": "ok"}


@app.get("/dashboard", response_model=schemas.DashboardStats, tags=["Dashboard"])
def dashboard(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.dashboard_stats(db)


# ---------- Routers ----------
app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(books.router)
app.include_router(borrowers.router)
app.include_router(transactions.router)
app.include_router(search.router)
app.include_router(fines.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(etl.router)
app.include_router(analytics.router)
