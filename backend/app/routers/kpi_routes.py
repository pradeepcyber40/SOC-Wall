from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Asset, SecurityAlert
from app.schemas import KPISummary

router = APIRouter(prefix="/api/v1/kpis", tags=["KPIs"])

@router.get("", response_model=KPISummary)
def get_kpi_summary(db: Session = Depends(get_db)):
    """
    Returns real aggregated KPI counts strictly calculated from PostgreSQL database.
    Zero mock numbers. If 0 assets exist, returns 0.
    """
    total = db.query(Asset).count()
    online = db.query(Asset).filter(Asset.status == "ONLINE").count()
    offline = db.query(Asset).filter(Asset.status == "OFFLINE").count()
    warning = db.query(Asset).filter(Asset.status == "WARNING").count()
    unknown = db.query(Asset).filter(Asset.status == "UNKNOWN").count()
    
    sec_alerts = db.query(SecurityAlert).filter(SecurityAlert.status.in_(["New", "Investigating"])).count()
    critical_alerts = db.query(SecurityAlert).filter(
        SecurityAlert.status.in_(["New", "Investigating"]),
        SecurityAlert.severity == "Critical"
    ).count()

    return KPISummary(
        total_assets=total,
        online_assets=online,
        offline_assets=offline,
        security_alerts=sec_alerts,
        critical_alerts=critical_alerts,
        unknown_assets=unknown,
        warning_assets=warning,
        last_updated=datetime.utcnow()
    )
