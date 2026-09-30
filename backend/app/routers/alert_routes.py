from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import SecurityAlert, User
from app.auth import get_current_user, require_role, log_audit_event
from app.integrations.wazuh_client import wazuh_client
from app.integrations.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/v1/alerts", tags=["Security Alerts"])

@router.get("")
async def get_security_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns real security alerts from PostgreSQL database and real Wazuh/OpenSearch status.
    Zero mock alerts. If 0 alerts exist, returns total: 0 and empty items list.
    """
    query = db.query(SecurityAlert)
    
    if severity and severity.lower() != "all":
        query = query.filter(SecurityAlert.severity == severity)
        
    if status and status.lower() != "all":
        query = query.filter(SecurityAlert.status == status)
        
    if source and source.lower() != "all":
        query = query.filter(SecurityAlert.source == source)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (SecurityAlert.alert_id.ilike(s)) |
            (SecurityAlert.asset_hostname.ilike(s)) |
            (SecurityAlert.alert_type.ilike(s)) |
            (SecurityAlert.description.ilike(s))
        )

    total = query.count()
    items = query.order_by(desc(SecurityAlert.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    # Query integration connectivity statuses
    wazuh_status = await wazuh_client.get_health_status()
    opensearch_status = await opensearch_client.get_health_status()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "alert_id": a.alert_id,
                "severity": a.severity,
                "asset_id": a.asset_id or "Unassigned",
                "asset_hostname": a.asset_hostname,
                "source": a.source,
                "alert_type": a.alert_type,
                "description": a.description,
                "timestamp": a.created_at.isoformat(),
                "status": a.status,
                "assigned_analyst": a.assigned_analyst
            }
            for a in items
        ],
        "integrations": {
            "wazuh": wazuh_status,
            "opensearch": opensearch_status
        }
    }

@router.patch("/{alert_id}")
def update_alert_status(
    alert_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin", "SOC Admin", "SOC Analyst"]))
):
    alert = db.query(SecurityAlert).filter(SecurityAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_status = payload.get("status")
    assigned = payload.get("assigned_analyst")

    if new_status:
        alert.status = new_status
    if assigned:
        alert.assigned_analyst = assigned
    else:
        if alert.assigned_analyst == "Unassigned":
            alert.assigned_analyst = current_user.full_name

    db.commit()

    log_audit_event(
        db,
        user=current_user.username,
        action=f"Alert status updated to {alert.status}",
        resource=f"{alert.alert_id} ({alert.asset_hostname})",
        details=f"Assigned Analyst: {alert.assigned_analyst}"
    )

    return {"message": "Alert updated successfully", "alert_id": alert_id, "status": alert.status}
