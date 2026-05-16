"""
Borrow / Return / Transaction endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
import schemas
from database import get_db

router = APIRouter(tags=["Transactions"])


@router.post("/borrow", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def borrow_book(req: schemas.BorrowRequest, db: Session = Depends(get_db)):
    txn, err = crud.borrow_book(db, req.book_id, req.borrower_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return crud.serialize_transaction(txn)


@router.post("/return", response_model=schemas.TransactionOut)
def return_book(req: schemas.ReturnRequest, db: Session = Depends(get_db)):
    txn, err = crud.return_book(db, req.transaction_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return crud.serialize_transaction(txn)


@router.get("/transactions", response_model=List[schemas.TransactionOut])
def list_transactions(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    txns = crud.get_transactions(db, skip=skip, limit=limit)
    return [crud.serialize_transaction(t) for t in txns]
