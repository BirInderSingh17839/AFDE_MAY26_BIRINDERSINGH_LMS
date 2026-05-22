"""
Borrow / Return / Transaction endpoints.

Borrow & Return: admin or librarian (staff workflow).
Listing transactions: any authenticated user (students see all reads but only act via staff).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, require_staff
from database import get_db

router = APIRouter(tags=["Transactions"])


@router.post("/borrow", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def borrow_book(
    req: schemas.BorrowRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    txn, err = crud.borrow_book(db, req.book_id, req.borrower_id, loan_days=req.loan_days)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return crud.serialize_transaction(txn)


@router.post("/return", response_model=schemas.TransactionOut)
def return_book(
    req: schemas.ReturnRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    txn, err = crud.return_book(db, req.transaction_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return crud.serialize_transaction(txn)


@router.get("/transactions", response_model=List[schemas.TransactionOut])
def list_transactions(
    skip: int = 0,
    limit: int = 200,
    borrower_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Students see only their own transactions (via linked borrower)
    if user.role == "student":
        if not user.borrower_id:
            return []
        borrower_id = user.borrower_id
    txns = crud.get_transactions(db, skip=skip, limit=limit, borrower_id=borrower_id)
    return [crud.serialize_transaction(t) for t in txns]
