from typing import Optional, List
from datetime import datetime
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database import get_db
from app.models import (
    Asset, Agent, NetworkInterface, SoftwareInventory, ServiceInventory,
    PortInventory, SecurityAlert, User
)
from app.schemas import (
    AssetListResponse, AssetItem, AssetDetailResponse,
    NetworkInterfaceItem, ServiceItem, PortItem, SoftwareItem
)
from app.auth import get_current_user, require_role, log_audit_event

router = APIRouter(prefix="/api/v1/assets", tags=["Assets"])

@router.get("", response_model=AssetListResponse)
def get_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=200),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    subnet: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("first_seen"),
    sort_order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Asset)

    # Search filter
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Asset.asset_id.ilike(s),
                Asset.hostname.ilike(s),
                Asset.ip_address.ilike(s),
                Asset.mac_address.ilike(s),
                Asset.manufacturer.ilike(s),
                Asset.model.ilike(s),
                Asset.os.ilike(s)
            )
        )

    # Categorical filters
    if category and category.lower() != "all":
        query = query.filter(
            (Asset.category == category) | (Asset.category == f"{category}s")
        )
        
    if status and status.lower() != "all":
        query = query.filter(Asset.status == status.upper())
        
    if vendor and vendor.lower() != "all":
        query = query.filter(Asset.manufacturer.ilike(f"%{vendor}%"))
        
    if risk and risk.lower() != "all":
        query = query.filter(Asset.risk == risk)
        
    if subnet and subnet.lower() != "all":
        query = query.filter(Asset.subnet == subnet)

    # Sorting
    sort_column = getattr(Asset, sort_by, Asset.first_seen)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return AssetListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/export/csv")
def export_assets_csv(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    subnet: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Asset)
    if category and category.lower() != "all":
        query = query.filter(Asset.category == category)
    if status and status.lower() != "all":
        query = query.filter(Asset.status == status.upper())
    if subnet and subnet.lower() != "all":
        query = query.filter(Asset.subnet == subnet)

    assets = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Asset ID", "Hostname", "IP Address", "MAC Address", "Category",
        "Manufacturer", "Model", "OS", "Status", "Risk", "Managed By Agent",
        "Subnet", "First Seen", "Last Seen"
    ])

    for a in assets:
        writer.writerow([
            a.asset_id, a.hostname, a.ip_address, a.mac_address, a.category,
            a.manufacturer, a.model, a.os, a.status, a.risk, a.is_managed,
            a.subnet, a.first_seen.isoformat(), a.last_seen.isoformat()
        ])

    output.seek(0)
    filename = f"soc_real_asset_inventory_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{asset_id}", response_model=AssetDetailResponse)
def get_asset_detail(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Hardware information from agent if available
    agent = db.query(Agent).filter(Agent.agent_id == asset.agent_id).first() if asset.agent_id else None
    hardware_dict = None
    if agent:
        hardware_dict = {
            "cpu": agent.cpu_model or "CPU info unavailable",
            "cpu_cores": agent.cpu_cores or 0,
            "ram_gb": round((agent.ram_total_mb or 0) / 1024, 1),
            "storage_gb": agent.disk_total_gb or 0,
            "uptime_hours": round((agent.uptime_sec or 0) / 3600, 1),
            "os_build": agent.os_build or "N/A"
        }

    # Fetch associated real relations
    interfaces = db.query(NetworkInterface).filter(NetworkInterface.asset_id == asset_id).all()
    services = db.query(ServiceInventory).filter(ServiceInventory.asset_id == asset_id).all()
    ports = db.query(PortInventory).filter(PortInventory.asset_id == asset_id).all()
    software = db.query(SoftwareInventory).filter(SoftwareInventory.asset_id == asset_id).all()
    alerts = db.query(SecurityAlert).filter(SecurityAlert.asset_id == asset_id).all()

    return AssetDetailResponse(
        overview=asset,
        hardware=hardware_dict,
        network=interfaces,
        services=services,
        ports=ports,
        software=software,
        security_alerts=alerts
    )

@router.patch("/{asset_id}")
def update_asset(
    asset_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin", "SOC Admin"]))
):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    allowed_fields = ["category", "risk", "status", "hostname"]
    changes = []
    for k, v in payload.items():
        if k in allowed_fields and hasattr(asset, k):
            old_v = getattr(asset, k)
            setattr(asset, k, v)
            changes.append(f"{k}: '{old_v}' -> '{v}'")

    db.commit()
    log_audit_event(
        db,
        user=current_user.username,
        action="Admin manually adjusted asset properties",
        resource=asset_id,
        details="; ".join(changes)
    )
    return {"message": "Asset updated successfully", "asset_id": asset_id, "changes": changes}
