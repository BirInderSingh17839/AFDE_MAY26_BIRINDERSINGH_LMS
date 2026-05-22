"""
Notifications — per-user inbox.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=List[schemas.NotificationOut])
def list_notifications(
    unread_only: bool = Query(False),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.list_notifications(db, user.user_id, unread_only=unread_only)


@router.post("/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_read(
    notification_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = crud.mark_notification_read(db, user.user_id, notification_id)
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    return n


@router.post("/read-all")
def read_all(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crud.mark_all_notifications_read(db, user.user_id)
    return {"detail": "All notifications marked as read"}


@router.get("/unread-count")
def unread_count(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = crud.list_notifications(db, user.user_id, unread_only=True)
    return {"count": len(items)}
