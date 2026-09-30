from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DiscoveryRange, AgentConfiguration, User
from app.auth import get_current_user, require_role, log_audit_event
from app.websocket_hub import hub

router = APIRouter(prefix="/api/v1/discovery", tags=["Discovery Configuration"])

@router.get("/config")
def get_discovery_config(db: Session = Depends(get_db)):
    """
    Returns the latest dynamic discovery configuration and authorized CIDR ranges.
    """
    active_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    ranges = db.query(DiscoveryRange).all()

    return {
        "version": active_cfg.version if active_cfg else 1,
        "authorized_ranges": [
            {
                "id": r.id,
                "cidr": r.cidr,
                "name": r.name,
                "is_active": r.is_active,
                "scan_interval_sec": r.scan_interval_sec,
                "scan_jitter_sec": r.scan_jitter_sec,
                "max_packet_rate": r.max_packet_rate
            }
            for r in ranges
        ],
        "global_config": active_cfg.config_json if active_cfg else {}
    }

@router.put("/config")
async def update_discovery_config(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin", "SOC Admin"]))
):
    """
    Updates authorized discovery CIDR ranges and bumps the configuration_version.
    Connected Windows agents detect the version increment on next heartbeat
    and download the updated configuration automatically.
    """
    now = datetime.utcnow()

    # If new CIDRs provided
    if "authorized_cidrs" in payload:
        new_cidrs = payload["authorized_cidrs"]
        # Deactivate ranges not in list, activate/add ranges in list
        for cidr_str in new_cidrs:
            existing = db.query(DiscoveryRange).filter(DiscoveryRange.cidr == cidr_str).first()
            if not existing:
                new_range = DiscoveryRange(
                    cidr=cidr_str,
                    name=f"Subnet {cidr_str}",
                    is_active=True
                )
                db.add(new_range)
            else:
                existing.is_active = True

    # Bump version
    latest_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    new_version_num = (latest_cfg.version + 1) if latest_cfg else 1

    merged_config = latest_cfg.config_json.copy() if latest_cfg and latest_cfg.config_json else {}
    merged_config.update(payload)
    merged_config["version"] = new_version_num

    new_cfg_row = AgentConfiguration(
        version=new_version_num,
        config_json=merged_config,
        is_active=True,
        updated_by=current_user.username,
        created_at=now
    )
    db.add(new_cfg_row)
    db.commit()

    log_audit_event(
        db,
        user=current_user.username,
        action="Admin updated discovery configuration",
        resource="Discovery Engine",
        details=f"Bumped to configuration_version {new_version_num}"
    )

    # Broadcast WebSocket CONFIG_UPDATED event
    await hub.broadcast_event("CONFIG_UPDATED", {
        "version": new_version_num,
        "updated_by": current_user.username,
        "timestamp": now.isoformat()
    })

    return {
        "status": "SUCCESS",
        "configuration_version": new_version_num,
        "message": f"Discovery configuration bumped to version {new_version_num}. Agents will automatically pull updates."
    }
