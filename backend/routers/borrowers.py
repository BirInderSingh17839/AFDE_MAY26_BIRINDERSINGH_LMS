"""
Borrower management endpoints.

Read: any authenticated user.
Write: admin or librarian.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, require_staff
from database import get_db

router = APIRouter(prefix="/borrowers", tags=["Borrowers"])


@router.get("/", response_model=List[schemas.BorrowerOut])
def list_borrowers(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.get_borrowers(db, skip=skip, limit=limit)


@router.get("/{borrower_id}", response_model=schemas.BorrowerOut)
def read_borrower(
    borrower_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    borrower = crud.get_borrower(db, borrower_id)
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return borrower


@router.post("/", response_model=schemas.BorrowerOut, status_code=status.HTTP_201_CREATED)
def create_borrower(
    borrower: schemas.BorrowerCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    if crud.get_borrower_by_email(db, borrower.email):
        raise HTTPException(status_code=400, detail="A borrower with this email already exists")
    return crud.create_borrower(db, borrower)


@router.put("/{borrower_id}", response_model=schemas.BorrowerOut)
def update_borrower(
    borrower_id: int,
    borrower: schemas.BorrowerUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    updated = crud.update_borrower(db, borrower_id, borrower)
    if not updated:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return updated


@router.delete("/{borrower_id}", status_code=status.HTTP_200_OK)
def delete_borrower(
    borrower_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    ok = crud.delete_borrower(db, borrower_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return {"detail": "Borrower deleted successfully"}
