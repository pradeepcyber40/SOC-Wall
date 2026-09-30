from datetime import datetime
from sqlalchemy.orm import Session
from app.models import User, DiscoveryRange, AgentConfiguration
from app.auth import hash_password

def seed_database(db: Session):
    """
    STRICT PRODUCTION INITIALIZATION:
    ZERO MOCK ASSETS! ZERO FAKE ALERTS!
    Only creates initial Super Admin and initial Discovery Ranges if database is empty.
    All asset data MUST originate from real Windows EXE agents and live discoveries.
    """
    # 1. Initialize Super Admin if no users exist
    admin_exists = db.query(User).filter(User.username == "superadmin").first()
    if not admin_exists:
        admin_user = User(
            username="superadmin",
            email="superadmin@rasinovatech.soc",
            full_name="Chief Information Security Officer",
            role="Super Admin",
            hashed_password=hash_password("password123"),
            is_active=True,
            created_at=datetime.utcnow()
        )
        soc_lead = User(
            username="socadmin",
            email="admin@rasinovatech.soc",
            full_name="SOC Operations Lead",
            role="SOC Admin",
            hashed_password=hash_password("password123"),
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(admin_user)
        db.add(soc_lead)
        db.commit()
        print("[INIT] Baseline SOC Admin accounts initialized.")

    # 2. Initialize default authorized discovery ranges if none exist
    if db.query(DiscoveryRange).count() == 0:
        default_ranges = [
            DiscoveryRange(cidr="192.168.1.0/24", name="Corporate Workstations Subnet", is_active=True, scan_interval_sec=900, scan_jitter_sec=30),
            DiscoveryRange(cidr="192.168.2.0/24", name="Engineering Laptops Subnet", is_active=True, scan_interval_sec=900, scan_jitter_sec=30),
            DiscoveryRange(cidr="10.0.10.0/24", name="Data Center Core Infrastructure", is_active=True, scan_interval_sec=1800, scan_jitter_sec=45),
        ]
        for r in default_ranges:
            db.add(r)
        db.commit()
        print("[INIT] Authorized discovery CIDR ranges created.")

    # 3. Initialize Agent Configuration Version 1 if not present
    if db.query(AgentConfiguration).count() == 0:
        initial_config = {
            "version": 1,
            "heartbeat_interval_sec": 60,
            "heartbeat_jitter_sec": 15,
            "discovery_enabled": True,
            "authorized_cidrs": ["192.168.1.0/24", "192.168.2.0/24", "10.0.10.0/24"],
            "scan_interval_sec": 900,
            "scan_jitter_sec": 30,
            "max_packet_rate": 100,
            "enable_snmp": False,
            "snmp_community": "public",
            "wazuh_agent_monitoring": True
        }
        cfg = AgentConfiguration(version=1, config_json=initial_config, is_active=True, updated_by="System Initializer")
        db.add(cfg)
        db.commit()
        print("[INIT] Agent configuration version 1 initialized.")

if __name__ == "__main__":
    from app.database import engine, Base, SessionLocal
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed_database(session)
    finally:
        session.close()
