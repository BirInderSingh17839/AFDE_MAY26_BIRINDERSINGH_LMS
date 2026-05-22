"""
Search endpoint — any authenticated user can search the catalog.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(tags=["Search"])


@router.get("/search", response_model=List[schemas.BookOut])
def search_books(
    q: Optional[str] = Query(None, description="Keyword search across title, author, category, ISBN"),
    title: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.search_books(db, q=q, title=title, author=author, category=category)
