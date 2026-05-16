"""
FastAPI entrypoint for the Library Management System.

Run locally:
    uvicorn main:app --reload --port 8000

Configure the database via the DATABASE_URL environment variable
(see database.py for examples). On startup, tables are auto-created.
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import crud
from database import Base, engine, get_db
from routers import books, borrowers, transactions, search

# Create database tables on startup (idempotent).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Library Management System API",
    description="Phase 1 capstone — manage books, borrowers, and lending transactions.",
    version="1.0.0",
)

# CORS — open during development so the React app can call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    return {
        "app": "Library Management System",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/dashboard", response_model=schemas.DashboardStats, tags=["Dashboard"])
def dashboard(db: Session = Depends(get_db)):
    return crud.dashboard_stats(db)


# Routers
app.include_router(books.router)
app.include_router(borrowers.router)
app.include_router(transactions.router)
app.include_router(search.router)
