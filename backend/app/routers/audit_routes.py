from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogListResponse, AuditLogItem
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    user: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin", "SOC Admin", "SOC Analyst", "Viewer"]))
):
    query = db.query(AuditLog)

    if user and user.lower() != "all":
        query = query.filter(AuditLog.username == user)

    if action and action.lower() != "all":
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    if result and result.lower() != "all":
        query = query.filter(AuditLog.result == result)

    total = query.count()
    items = query.order_by(desc(AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    mapped_items = [
        AuditLogItem(
            id=log.id,
            user=log.username,
            action=log.action,
            resource=log.resource,
            ip=log.ip,
            timestamp=log.created_at,
            result=log.result,
            details=log.details
        )
        for log in items
    ]

    return AuditLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=mapped_items
    )
