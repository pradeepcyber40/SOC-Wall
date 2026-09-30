import asyncio
import random
import logging
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Asset, SecurityAlert, Subnet
from app.websocket_hub import hub
from app.config import settings

logger = logging.getLogger("soc_streamer")

STREAM_EVENT_TEMPLATES = [
    {"type": "ONLINE", "icon": "check-circle", "severity": "info", "msg": "Laptop {name} detected on {subnet}"},
    {"type": "OFFLINE", "icon": "alert-triangle", "severity": "warning", "msg": "Camera {name} probe timeout (3 missed pings)"},
    {"type": "ALERT", "icon": "shield-alert", "severity": "high", "msg": "RDP port 3389 inbound connection detected on {name}"},
    {"type": "NEW ASSET", "icon": "plus-circle", "severity": "info", "msg": "New authorized network asset {name} discovered via ARP scan"},
    {"type": "SECURITY", "icon": "flame", "severity": "critical", "msg": "High severity Wazuh event: Rule 5710 (SSH Brute Force) on {name}"},
    {"type": "HEARTBEAT", "icon": "activity", "severity": "low", "msg": "Wazuh Agent heartbeat refreshed on {name}"},
    {"type": "POLICY", "icon": "shield-check", "severity": "medium", "msg": "OpenSearch audit: Unauthorized USB storage blocked on {name}"},
    {"type": "VULN", "icon": "bug", "severity": "high", "msg": "Vulnerability CVE-2024-21413 detected in Outlook on {name}"},
]

async def live_soc_telemetry_loop():
    logger.info("Starting live SOC telemetry generator loop...")
    await asyncio.sleep(2) # Initial warmup
    
    while True:
        try:
            if not settings.SIMULATE_LIVE_TELEMETRY:
                await asyncio.sleep(5)
                continue

            # Every 4-8 seconds, pick an event
            await asyncio.sleep(random.uniform(4.0, 7.5))
            
            db = SessionLocal()
            try:
                # Pick a random asset
                asset_count = db.query(Asset).count()
                if asset_count == 0:
                    continue

                random_offset = random.randint(0, max(0, min(asset_count - 1, 300)))
                asset = db.query(Asset).offset(random_offset).first()
                if not asset:
                    continue

                template = random.choice(STREAM_EVENT_TEMPLATES)
                event_type = template["type"]
                event_text = f"[{event_type}] " + template["msg"].format(
                    name=asset.hostname,
                    subnet=asset.subnet
                )
                
                # Update asset heartbeat or status if appropriate
                now = datetime.utcnow()
                if event_type == "ONLINE":
                    asset.status = "ONLINE"
                    asset.last_heartbeat = now
                    asset.last_seen = now
                    asset.network_availability_pct = round(random.uniform(97.0, 100.0), 1)
                elif event_type == "OFFLINE":
                    # Only occasional offline transitions
                    if random.random() < 0.35:
                        asset.status = "OFFLINE"
                        asset.network_availability_pct = 0.0
                elif event_type in ["ALERT", "SECURITY", "VULN"]:
                    # Create or update an alert
                    new_alert_id = f"ALT-{random.randint(1000, 9999)}"
                    alert_sev = "Critical" if event_type == "SECURITY" else ("High" if event_type in ["ALERT", "VULN"] else "Medium")
                    
                    alert = SecurityAlert(
                        alert_id=new_alert_id,
                        severity=alert_sev,
                        asset_id=asset.id,
                        asset_hostname=asset.hostname,
                        source="Wazuh" if event_type == "SECURITY" else "OpenSearch",
                        alert_type=f"{event_type}_TRIGGER",
                        description=event_text,
                        timestamp=now,
                        status="New",
                        assigned_analyst="Unassigned"
                    )
                    db.add(alert)
                    asset.risk = "Critical" if alert_sev == "Critical" else "High"
                
                db.commit()

                # Calculate current live KPI counts
                total_assets = db.query(Asset).count()
                online_count = db.query(Asset).filter(Asset.status == "ONLINE").count()
                offline_count = db.query(Asset).filter(Asset.status == "OFFLINE").count()
                warning_count = db.query(Asset).filter(Asset.status == "WARNING").count()
                unknown_count = db.query(Asset).filter(Asset.status == "UNKNOWN").count()
                total_alerts = db.query(SecurityAlert).filter(SecurityAlert.status.in_(["New", "Investigating"])).count()
                critical_alerts = db.query(SecurityAlert).filter(
                    SecurityAlert.status.in_(["New", "Investigating"]),
                    SecurityAlert.severity == "Critical"
                ).count()

                # Broadcast live SOC event
                soc_event_payload = {
                    "id": f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
                    "type": event_type,
                    "severity": template["severity"],
                    "asset_id": asset.id,
                    "hostname": asset.hostname,
                    "message": event_text,
                    "timestamp": now.strftime("%H:%M:%S"),
                    "raw_timestamp": now.isoformat()
                }
                
                await hub.broadcast_event("SOC_EVENT", soc_event_payload)
                
                # Broadcast KPI update
                kpi_payload = {
                    "total_assets": total_assets,
                    "online_assets": online_count,
                    "offline_assets": offline_count,
                    "warning_assets": warning_count,
                    "unknown_assets": unknown_count,
                    "security_alerts": total_alerts,
                    "critical_alerts": critical_alerts,
                    "last_updated": now.isoformat()
                }
                await hub.broadcast_event("KPI_UPDATE", kpi_payload)

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error in live telemetry loop: {e}")
            await asyncio.sleep(5)
