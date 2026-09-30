from datetime import datetime
from app.config import settings

class StatusEngine:
    """
    Production SOC Status Engine:
    Does NOT rely on a single failed ping or single check.
    Fuses:
    - Last heartbeat timestamp
    - Last seen timestamp
    - Discovery status (Active, Stale, Unresponsive)
    - Agent status (Active, Disconnected, Unmanaged)
    - Configured timeout parameters
    - Network availability percentage
    """
    
    @staticmethod
    def evaluate_status(
        last_heartbeat: datetime,
        last_seen: datetime,
        discovery_status: str,
        agent_status: str,
        network_availability_pct: float,
        category: str = "Computers",
        now: datetime = None
    ) -> str:
        if now is None:
            now = datetime.utcnow()
            
        heartbeat_age = (now - last_heartbeat).total_seconds() if last_heartbeat else 999999
        last_seen_age = (now - last_seen).total_seconds() if last_seen else 999999
        
        # 1. Check for Unknown condition
        if discovery_status == "Unresponsive" or last_seen_age > settings.DISCOVERY_STALE_SEC:
            if network_availability_pct < 10.0:
                return "UNKNOWN"
            return "UNKNOWN"
            
        # 2. Endpoints with Wazuh / OS Agents
        if agent_status == "Active":
            if heartbeat_age <= settings.HEARTBEAT_TIMEOUT_SEC and network_availability_pct >= 80.0:
                return "ONLINE"
            elif heartbeat_age <= settings.OFFLINE_TIMEOUT_SEC or network_availability_pct >= 40.0:
                return "WARNING"
            else:
                return "OFFLINE"
                
        elif agent_status == "Disconnected":
            # Agent stopped responding, but network ping might still succeed
            if network_availability_pct >= 70.0:
                return "WARNING" # Box is up, but agent service is down
            return "OFFLINE"
            
        else: # Unmanaged devices (Routers, Switches, Printers, Cameras, IoT)
            if network_availability_pct >= 85.0 and last_seen_age <= settings.HEARTBEAT_TIMEOUT_SEC * 2:
                return "ONLINE"
            elif network_availability_pct >= 40.0 or last_seen_age <= settings.OFFLINE_TIMEOUT_SEC:
                return "WARNING"
            elif last_seen_age > settings.DISCOVERY_STALE_SEC:
                return "UNKNOWN"
            else:
                return "OFFLINE"

    @staticmethod
    def get_status_badge_meta(status_str: str) -> dict:
        mapping = {
            "ONLINE": {"color": "emerald", "border": "#10b981", "desc": "Healthy heartbeat & network availability"},
            "WARNING": {"color": "amber", "border": "#f59e0b", "desc": "Intermittent telemetry or agent disconnected"},
            "OFFLINE": {"color": "slate", "border": "#64748b", "desc": "Unreachable across multiple discovery probes"},
            "UNKNOWN": {"color": "purple", "border": "#a855f7", "desc": "Incomplete probe telemetry or stale discovery state"}
        }
        return mapping.get(status_str, mapping["UNKNOWN"])
