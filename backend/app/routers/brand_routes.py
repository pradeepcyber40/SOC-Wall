from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models import Asset

router = APIRouter(prefix="/api/v1/brands", tags=["Brand Distribution"])

@router.get("")
def get_real_brand_distribution(db: Session = Depends(get_db)):
    """
    Returns actual OEM brand distributions grouped from discovered assets.
    If 0 assets exist, returns empty list [].
    """
    brand_counts = db.query(
        Asset.manufacturer,
        func.count(Asset.asset_id).label("total")
    ).group_by(Asset.manufacturer).order_by(desc("total")).all()

    if not brand_counts:
        return []

    results = []
    for mfg, count in brand_counts:
        online = db.query(Asset).filter(Asset.manufacturer == mfg, Asset.status == "ONLINE").count()
        offline = count - online
        
        has_crit = db.query(Asset).filter(
            Asset.manufacturer == mfg,
            Asset.risk.in_(["Critical", "High"])
        ).count() > 0

        results.append({
            "brand": mfg if mfg else "Unspecified OEM",
            "count": count,
            "online": online,
            "offline": offline,
            "risk_summary": "Elevated Risk" if has_crit else "Healthy"
        })

    return results
