"""
ETL pipeline endpoints.

POST /etl/upload?entity=books|borrowers|transactions
GET  /etl/logs        - list ETL run history
GET  /etl/logs/{id}   - single run details
POST /etl/snapshot    - regenerate the overdue_reports snapshot
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from sqlalchemy.orm import Session

import models
import schemas
from auth import require_staff
from database import get_db
from services import etl as etl_service

router = APIRouter(prefix="/etl", tags=["ETL"])

VALID_ENTITIES = ("books", "borrowers", "transactions")


@router.post("/upload", response_model=schemas.EtlRunResult)
async def upload_dataset(
    entity: str = Form(..., description="One of: books | borrowers | transactions"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_staff),
):
    """Upload a CSV/XLSX file and run the ETL pipeline for the chosen entity."""
    if entity not in VALID_ENTITIES:
        raise HTTPException(status_code=400, detail=f"entity must be one of {VALID_ENTITIES}")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file supplied")
    # Size sanity check: 10 MB
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    result = etl_service.run_etl(
        db, entity=entity, file_bytes=raw, filename=file.filename, user_id=user.user_id,
    )
    return {
        "log": result.log,
        "sample_failed": result.sample_failed,
        "summary_lines": result.summary_lines,
    }


@router.get("/logs", response_model=List[schemas.EtlLogOut])
def list_logs(
    entity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    q = db.query(models.EtlLog)
    if entity:
        q = q.filter(models.EtlLog.entity == entity)
    if status:
        q = q.filter(models.EtlLog.status == status)
    return q.order_by(models.EtlLog.log_id.desc()).limit(limit).all()


@router.get("/logs/{log_id}", response_model=schemas.EtlLogOut)
def get_log(log_id: int, db: Session = Depends(get_db), _: models.User = Depends(require_staff)):
    log = db.query(models.EtlLog).filter(models.EtlLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="ETL log not found")
    return log


@router.post("/snapshot")
def snapshot(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_staff),
):
    report = etl_service.snapshot_overdue_report(db)
    return {
        "snapshot_id": report.report_id,
        "snapshot_date": report.snapshot_date,
        "total_transactions": report.total_transactions,
        "overdue_count": report.overdue_count,
        "overdue_percentage": report.overdue_percentage,
        "average_days_overdue": report.average_days_overdue,
        "estimated_fines": report.estimated_fines,
    }
