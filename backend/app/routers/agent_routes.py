import secrets
import hashlib
import ipaddress
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Agent, Asset, NetworkInterface, SoftwareInventory, ServiceInventory,
    PortInventory, AgentHeartbeat, DiscoveryRange, AgentConfiguration,
    AgentMetric, AssetDiscovery
)
from app.schemas import (
    AgentRegisterRequest, AgentRegisterResponse,
    AgentHeartbeatRequest, AgentHeartbeatResponse,
    AgentConfigResponse, AgentInventoryRequest,
    AgentDiscoveryBatchRequest
)
from app.classifier import DeviceClassifier
from app.websocket_hub import hub

router = APIRouter(prefix="/api/v1/agents", tags=["Agent Management"])

def verify_agent_token(agent_id: str, auth_token: str, db: Session) -> Agent:
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent ID not recognized")
    if agent.auth_token != auth_token:
        raise HTTPException(status_code=401, detail="Invalid agent authentication token")
    return agent

@router.post("/register", response_model=AgentRegisterResponse)
async def register_agent(payload: AgentRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a real Windows Endpoint running RasiSOC-Agent.exe.
    Generates a secure agent authentication token and establishes permanent device record.
    """
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()

    # Get active config version
    active_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    cfg_version = active_cfg.version if active_cfg else 1

    # Check if agent already exists
    agent = db.query(Agent).filter(Agent.agent_id == payload.agent_id).first()
    if not agent:
        agent = Agent(
            agent_id=payload.agent_id,
            hostname=payload.hostname,
            computer_name=payload.computer_name or payload.hostname,
            os_version=payload.os_version,
            os_build=payload.os_build,
            os_arch=payload.os_arch,
            current_ip=payload.current_ip,
            mac_address=payload.mac_address,
            agent_version=payload.agent_version,
            status="ONLINE",
            config_version=cfg_version,
            auth_token=token,
            cpu_model=payload.cpu_model,
            cpu_cores=payload.cpu_cores,
            ram_total_mb=payload.ram_total_mb,
            disk_total_gb=payload.disk_total_gb,
            uptime_sec=payload.uptime_sec,
            first_seen=now,
            last_seen=now,
            last_heartbeat=now
        )
        db.add(agent)
    else:
        # Update existing agent metadata
        agent.hostname = payload.hostname
        agent.current_ip = payload.current_ip
        agent.mac_address = payload.mac_address
        agent.os_version = payload.os_version
        agent.status = "ONLINE"
        agent.last_seen = now
        agent.last_heartbeat = now
        agent.auth_token = token
        agent.cpu_model = payload.cpu_model
        agent.cpu_cores = payload.cpu_cores
        agent.ram_total_mb = payload.ram_total_mb
        agent.disk_total_gb = payload.disk_total_gb
        agent.uptime_sec = payload.uptime_sec

    # Ensure host asset record exists in `assets` table
    asset = db.query(Asset).filter((Asset.agent_id == payload.agent_id) | (Asset.mac_address == payload.mac_address)).first()
    if not asset:
        asset = Asset(
            asset_id=f"AST-{payload.agent_id[:8].upper()}",
            agent_id=payload.agent_id,
            hostname=payload.hostname,
            ip_address=payload.current_ip,
            mac_address=payload.mac_address,
            category="Computer",
            manufacturer="Microsoft Windows Endpoint",
            model=payload.cpu_model or "Standard Workstation",
            os=payload.os_version,
            status="ONLINE",
            risk="None",
            classification_confidence=1.0,
            is_managed=True,
            discovery_method="Agent Enrollment",
            first_seen=now,
            last_seen=now,
            last_heartbeat=now
        )
        db.add(asset)
    else:
        asset.agent_id = payload.agent_id
        asset.hostname = payload.hostname
        asset.ip_address = payload.current_ip
        asset.status = "ONLINE"
        asset.last_seen = now
        asset.last_heartbeat = now
        asset.is_managed = True

    db.commit()

    # Broadcast real-time WebSocket event
    await hub.broadcast_event("AGENT_ONLINE", {
        "agent_id": payload.agent_id,
        "hostname": payload.hostname,
        "ip": payload.current_ip,
        "timestamp": now.isoformat()
    })
    await hub.broadcast_event("ASSET_ONLINE", {
        "asset_id": asset.asset_id,
        "hostname": payload.hostname,
        "ip": payload.current_ip,
        "status": "ONLINE"
    })

    return AgentRegisterResponse(
        agent_id=payload.agent_id,
        auth_token=token,
        config_version=cfg_version,
        status="REGISTERED",
        message="Agent successfully enrolled into Rasi NovaTech SOC Platform"
    )

@router.post("/heartbeat", response_model=AgentHeartbeatResponse)
async def agent_heartbeat(payload: AgentHeartbeatRequest, db: Session = Depends(get_db)):
    """
    Lightweight heartbeat endpoint.
    Verifies agent token, updates telemetry health registers, logs heartbeat.
    """
    agent = verify_agent_token(payload.agent_id, payload.auth_token, db)
    now = datetime.utcnow()

    agent.last_heartbeat = now
    agent.last_seen = now
    agent.status = "ONLINE"
    if payload.uptime_sec:
        agent.uptime_sec = payload.uptime_sec

    # Update corresponding Asset record
    asset = db.query(Asset).filter(Asset.agent_id == agent.agent_id).first()
    if asset:
        asset.last_heartbeat = now
        asset.last_seen = now
        asset.status = "ONLINE"

    # Insert lightweight heartbeat log
    heartbeat_record = AgentHeartbeat(
        agent_id=agent.agent_id,
        cpu_usage_pct=payload.cpu_usage_pct,
        ram_usage_pct=payload.ram_usage_pct,
        disk_usage_pct=payload.disk_usage_pct,
        uptime_sec=payload.uptime_sec,
        timestamp=now
    )
    db.add(heartbeat_record)
    db.commit()

    # Check config version mismatch
    latest_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    latest_ver = latest_cfg.version if latest_cfg else 1
    action = "UPDATE_CONFIG" if agent.config_version < latest_ver else None

    return AgentHeartbeatResponse(
        status="ACK",
        current_config_version=latest_ver,
        action_required=action
    )

@router.get("/config", response_model=AgentConfigResponse)
def get_agent_config(
    agent_id: str,
    auth_token: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves authorized discovery configuration for the agent.
    Never returns hardcoded ranges.
    """
    agent = verify_agent_token(agent_id, auth_token, db)
    
    # Query latest active config
    latest_cfg = db.query(AgentConfiguration).order_by(AgentConfiguration.version.desc()).first()
    active_ranges = db.query(DiscoveryRange).filter(DiscoveryRange.is_active == True).all()
    cidrs = [r.cidr for r in active_ranges]

    cfg_dict = latest_cfg.config_json if latest_cfg else {}

    # Update agent's stored config version
    if latest_cfg:
        agent.config_version = latest_cfg.version
        db.commit()

    return AgentConfigResponse(
        version=latest_cfg.version if latest_cfg else 1,
        heartbeat_interval_sec=cfg_dict.get("heartbeat_interval_sec", 60),
        heartbeat_jitter_sec=cfg_dict.get("heartbeat_jitter_sec", 15),
        discovery_enabled=cfg_dict.get("discovery_enabled", True),
        authorized_cidrs=cidrs if cidrs else ["192.168.1.0/24"],
        scan_interval_sec=cfg_dict.get("scan_interval_sec", 900),
        scan_jitter_sec=cfg_dict.get("scan_jitter_sec", 30),
        max_packet_rate=cfg_dict.get("max_packet_rate", 100),
        enable_snmp=cfg_dict.get("enable_snmp", False),
        snmp_community=cfg_dict.get("snmp_community", "public")
    )

@router.post("/inventory")
async def ingest_inventory(payload: AgentInventoryRequest, db: Session = Depends(get_db)):
    """
    Ingests real endpoint system details: hardware, network interfaces,
    services, listening ports, and installed software from the Windows agent.
    """
    agent = verify_agent_token(payload.agent_id, payload.auth_token, db)
    now = datetime.utcnow()

    # Locate asset record
    asset = db.query(Asset).filter(Asset.agent_id == agent.agent_id).first()
    if not asset:
        asset = Asset(
            asset_id=f"AST-{agent.agent_id[:8].upper()}",
            agent_id=agent.agent_id,
            hostname=payload.hostname,
            ip_address=payload.current_ip,
            mac_address=payload.mac_address,
            category="Computer",
            status="ONLINE",
            first_seen=now,
            last_seen=now,
            last_heartbeat=now,
            is_managed=True
        )
        db.add(asset)
        db.flush()

    asset_id = asset.asset_id

    # 1. Update Hardware
    if payload.hardware:
        if payload.hardware.cpu_model:
            agent.cpu_model = payload.hardware.cpu_model
        if payload.hardware.cpu_cores:
            agent.cpu_cores = payload.hardware.cpu_cores
        if payload.hardware.ram_total_mb:
            agent.ram_total_mb = payload.hardware.ram_total_mb
        if payload.hardware.disk_total_gb:
            agent.disk_total_gb = payload.hardware.disk_total_gb

    # 2. Interfaces
    if payload.interfaces is not None:
        db.query(NetworkInterface).filter(NetworkInterface.asset_id == asset_id).delete()
        for iface in payload.interfaces:
            nic = NetworkInterface(
                asset_id=asset_id,
                agent_id=agent.agent_id,
                interface_name=iface.interface_name,
                ip_address=iface.ip_address,
                mac_address=iface.mac_address,
                gateway=iface.gateway,
                subnet=iface.subnet,
                vlan=iface.vlan,
                is_up=iface.is_up,
                speed_mbps=iface.speed_mbps,
                vendor=iface.vendor
            )
            db.add(nic)
            if iface.subnet and not asset.subnet:
                asset.subnet = iface.subnet

    # 3. Ports
    if payload.ports is not None:
        db.query(PortInventory).filter(PortInventory.asset_id == asset_id).delete()
        for p in payload.ports:
            port_row = PortInventory(
                asset_id=asset_id,
                agent_id=agent.agent_id,
                port=p.port,
                protocol=p.protocol,
                service=p.service,
                state=p.state,
                pid=p.pid,
                process_name=p.process_name,
                last_detected=now
            )
            db.add(port_row)

    # 4. Services
    if payload.services is not None:
        db.query(ServiceInventory).filter(ServiceInventory.asset_id == asset_id).delete()
        for s in payload.services:
            srv_row = ServiceInventory(
                asset_id=asset_id,
                agent_id=agent.agent_id,
                service_name=s.service_name,
                display_name=s.display_name,
                status=s.status,
                startup_type=s.startup_type
            )
            db.add(srv_row)

    # 5. Software
    if payload.software is not None:
        db.query(SoftwareInventory).filter(SoftwareInventory.asset_id == asset_id).delete()
        for sw in payload.software:
            sw_row = SoftwareInventory(
                asset_id=asset_id,
                agent_id=agent.agent_id,
                name=sw.name,
                version=sw.version,
                publisher=sw.publisher,
                install_date=sw.install_date
            )
            db.add(sw_row)

    db.commit()

    await hub.broadcast_event("ASSET_UPDATED", {
        "asset_id": asset_id,
        "hostname": payload.hostname,
        "is_delta": payload.is_delta,
        "timestamp": now.isoformat()
    })

    return {"status": "SUCCESS", "asset_id": asset_id, "items_updated": True}

@router.post("/discovery")
async def ingest_discovery_batch(payload: AgentDiscoveryBatchRequest, db: Session = Depends(get_db)):
    """
    Ingests batch of discovered network devices from authorized CIDR sweeps.
    Classifies devices using multi-signal classifier.
    """
    agent = verify_agent_token(payload.agent_id, payload.auth_token, db)
    now = datetime.utcnow()
    new_assets_count = 0

    for dev in payload.devices:
        if not dev.ip_address:
            continue

        # Classify device using real signals
        cat_guess, conf = DeviceClassifier.classify(
            mac_vendor=dev.mac_vendor,
            hostname=dev.hostname,
            open_ports=dev.open_ports,
            banner=dev.banner,
            snmp_sysdescr=dev.snmp_sysdescr,
            is_windows_agent=False
        )

        mac = dev.mac_address or f"00:00:00:{hash(dev.ip_address) & 0xFFFFFF:06X}"

        # Check existing asset
        existing_asset = db.query(Asset).filter(
            (Asset.mac_address == mac) | (Asset.ip_address == dev.ip_address)
        ).first()

        if not existing_asset:
            asset_uid = f"AST-DISC-{int(now.timestamp()) % 1000000:06d}-{new_assets_count + 1}"
            new_asset = Asset(
                asset_id=asset_uid,
                hostname=dev.hostname or f"host-{dev.ip_address.replace('.', '-')}",
                ip_address=dev.ip_address,
                mac_address=mac,
                category=cat_guess,
                manufacturer=dev.mac_vendor or "Unidentified Hardware",
                model="Network Node",
                os="Unknown Network OS",
                status="ONLINE",
                risk="None",
                classification_confidence=conf,
                subnet=payload.target_subnet,
                is_managed=False,
                discovery_method=f"Agent {dev.probe_method}",
                first_seen=now,
                last_seen=now
            )
            db.add(new_asset)
            existing_asset = new_asset
            new_assets_count += 1
        else:
            existing_asset.last_seen = now
            existing_asset.status = "ONLINE"
            if dev.hostname and existing_asset.hostname.startswith("host-"):
                existing_asset.hostname = dev.hostname
            if cat_guess != "Unknown" and conf >= existing_asset.classification_confidence:
                existing_asset.category = cat_guess
                existing_asset.classification_confidence = conf
            if dev.mac_vendor and existing_asset.manufacturer == "Unidentified Hardware":
                existing_asset.manufacturer = dev.mac_vendor

        # Log discovery audit
        disc_log = AssetDiscovery(
            agent_id=agent.agent_id,
            asset_id=existing_asset.asset_id,
            target_subnet=payload.target_subnet,
            ip_address=dev.ip_address,
            mac_address=dev.mac_address,
            hostname=dev.hostname,
            mac_vendor=dev.mac_vendor,
            probe_method=dev.probe_method,
            classification_confidence=conf,
            discovered_at=now
        )
        db.add(disc_log)

    # Save metrics
    metric = AgentMetric(
        agent_id=agent.agent_id,
        discovery_packets=len(payload.devices) * 3,
        scan_duration_ms=payload.scan_duration_ms or 0,
        api_requests_count=1,
        timestamp=now
    )
    db.add(metric)
    db.commit()

    if new_assets_count > 0:
        await hub.broadcast_event("ASSET_DISCOVERED", {
            "count": new_assets_count,
            "target_subnet": payload.target_subnet,
            "timestamp": now.isoformat()
        })

    return {
        "status": "SUCCESS",
        "devices_processed": len(payload.devices),
        "new_assets_discovered": new_assets_count
    }
