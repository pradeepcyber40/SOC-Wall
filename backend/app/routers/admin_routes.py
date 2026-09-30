from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, DiscoveryRange, AgentConfiguration, Agent, Asset
from app.schemas import UserResponse, UserCreate
from app.auth import get_current_user, require_role, hash_password, log_audit_event

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Controls"])

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin", "SOC Admin"]))
):
    return db.query(User).order_by(User.id).all()

@router.post("/users", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin"]))
):
    existing = db.query(User).filter((User.username == payload.username) | (User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    new_user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=hash_password(payload.password),
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db,
        user=current_user.username,
        action="Admin created user",
        resource=payload.username,
        details=f"Created user with role {payload.role}"
    )

    return new_user

@router.get("/config")
def get_system_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    latest_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    return latest_cfg.config_json if latest_cfg else {}

@router.put("/config")
def update_system_config(
    configs: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Super Admin", "SOC Admin"]))
):
    now = datetime.utcnow()
    latest_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    new_version = (latest_cfg.version + 1) if latest_cfg else 1

    merged = latest_cfg.config_json.copy() if latest_cfg and latest_cfg.config_json else {}
    merged.update(configs)
    merged["version"] = new_version

    new_cfg = AgentConfiguration(
        version=new_version,
        config_json=merged,
        is_active=True,
        updated_by=current_user.username,
        created_at=now
    )
    db.add(new_cfg)
    db.commit()

    log_audit_event(
        db,
        user=current_user.username,
        action="Admin updated system configuration",
        resource="Configuration Engine",
        details=f"Bumped version to {new_version}"
    )

    return {"message": "Configuration successfully applied", "version": new_version}

@router.get("/agents-summary")
def get_agents_summary(db: Session = Depends(get_db)):
    active_count = db.query(Agent).filter(Agent.status == "ONLINE").count()
    disconnected_count = db.query(Agent).filter(Agent.status == "OFFLINE").count()
    warning_count = db.query(Agent).filter(Agent.status == "WARNING").count()
    unmanaged_count = db.query(Asset).filter(Asset.is_managed == False).count()

    return {
        "agents_online": active_count,
        "agents_offline": disconnected_count,
        "agents_warning": warning_count,
        "unmanaged_devices_discovered": unmanaged_count,
        "total_managed_agents": active_count + disconnected_count + warning_count
    }
