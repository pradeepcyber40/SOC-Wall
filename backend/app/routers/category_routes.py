from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Asset
from app.schemas import CategorySummary

router = APIRouter(prefix="/api/v1/categories", tags=["Categories"])

CATEGORY_ORDER = [
    "Computer", "Laptop", "Server", "Mobile", "Router",
    "Switch", "Firewall", "Printer", "Camera", "Access Point",
    "IoT", "Other", "Unknown"
]

@router.get("", response_model=List[CategorySummary])
def get_categories_summary(db: Session = Depends(get_db)):
    """
    Returns real category summary rows from the database.
    Zero fake counts.
    """
    results = []

    for cat in CATEGORY_ORDER:
        # Match singular or plural category name
        total = db.query(Asset).filter(
            (Asset.category == cat) | (Asset.category == f"{cat}s")
        ).count()

        if total == 0:
            results.append(CategorySummary(
                category=cat,
                total=0,
                online=0,
                offline=0,
                unknown=0,
                percentage_online=0.0,
                risk="None",
                last_updated="No telemetry yet"
            ))
            continue

        online = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s")),
            Asset.status == "ONLINE"
        ).count()

        offline = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s")),
            Asset.status.in_(["OFFLINE", "WARNING"])
        ).count()

        unknown = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s")),
            Asset.status == "UNKNOWN"
        ).count()

        pct_online = round((online / total) * 100, 1) if total > 0 else 0.0

        # Assess dominant risk
        has_critical = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s")),
            Asset.risk == "Critical"
        ).count() > 0
        has_high = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s")),
            Asset.risk == "High"
        ).count() > 0
        has_medium = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s")),
            Asset.risk == "Medium"
        ).count() > 0

        cat_risk = "Critical" if has_critical else ("High" if has_high else ("Medium" if has_medium else "Low"))

        # Find most recent update time
        latest_asset = db.query(Asset).filter(
            ((Asset.category == cat) | (Asset.category == f"{cat}s"))
        ).order_by(Asset.last_seen.desc()).first()

        last_up = latest_asset.last_seen.strftime("%H:%M:%S") if latest_asset else "Just now"

        results.append(CategorySummary(
            category=cat,
            total=total,
            online=online,
            offline=offline,
            unknown=unknown,
            percentage_online=pct_online,
            risk=cat_risk,
            last_updated=last_up
        ))

    return results
