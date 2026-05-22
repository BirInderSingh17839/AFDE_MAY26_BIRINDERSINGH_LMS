"""
Fine management endpoints — list, pay, and waive fines.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, require_staff
from database import get_db

router = APIRouter(prefix="/fines", tags=["Fines"])


@router.get("/", response_model=List[schemas.FineOut])
def list_fines(
    status: Optional[str] = Query(None, description="Filter by status: unpaid | paid | waived"),
    borrower_id: Optional[int] = Query(None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Students only see their own fines (via linked borrower record)
    if user.role == "student":
        if not user.borrower_id:
            return []
        borrower_id = user.borrower_id
    fines = crud.list_fines(db, status=status, borrower_id=borrower_id)
    return [crud.serialize_fine(f) for f in fines]


@router.post("/pay", response_model=schemas.FineOut)
def pay_fine(
    payload: schemas.FinePayRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fine, err = crud.pay_fine(db, payload.fine_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return crud.serialize_fine(fine)


@router.post("/{fine_id}/waive", response_model=schemas.FineOut)
def waive_fine(
    fine_id: int,
    user: models.User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    fine, err = crud.waive_fine(db, fine_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return crud.serialize_fine(fine)
