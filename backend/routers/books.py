"""
Book management endpoints.

Read endpoints: any authenticated user.
Write endpoints (POST/PUT/DELETE): admin or librarian only.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, require_staff
from database import get_db

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("/", response_model=List[schemas.BookOut])
def list_books(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.get_books(db, skip=skip, limit=limit)


@router.get("/{book_id}", response_model=schemas.BookOut)
def read_book(book_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    book = crud.get_book(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("/", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(
    book: schemas.BookCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    existing = crud.get_book_by_isbn(db, book.isbn)
    if existing:
        raise HTTPException(status_code=400, detail="A book with this ISBN already exists")
    return crud.create_book(db, book)


@router.put("/{book_id}", response_model=schemas.BookOut)
def update_book(
    book_id: int,
    book: schemas.BookUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    updated = crud.update_book(db, book_id, book)
    if not updated:
        raise HTTPException(status_code=404, detail="Book not found")
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_200_OK)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    ok = crud.delete_book(db, book_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"detail": "Book deleted successfully"}
