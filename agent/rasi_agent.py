"""
RasiSOC-Agent Main Execution Engine
Version: 1.0.0
Production Windows Endpoint Monitoring & Network Asset Discovery Agent
"""

import sys
import os
import time
import json
import uuid
import random
import hashlib
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

from collector import (
    get_real_os_info,
    get_real_hardware_info,
    get_real_network_interfaces,
    get_real_listening_ports,
    get_real_windows_services,
    get_real_installed_software,
    get_real_system_health
)
from discovery import perform_authorized_discovery

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [RasiSOC-Agent]: %(message)s"
)
logger = logging.getLogger("rasi_agent")

DEFAULT_SERVER_URL = os.environ.get("RASI_SOC_SERVER_URL", "http://127.0.0.1:8000")
CONFIG_PATH = os.path.join(os.environ.get("PROGRAMDATA", "."), "RasiSOC", "agent_identity.json")

class RasiSOCAgent:
    def __init__(self, server_url: str = DEFAULT_SERVER_URL):
        self.server_url = server_url.rstrip("/")
        self.agent_id = None
        self.auth_token = None
        self.config_version = 0
        self.authorized_cidrs = ["192.168.1.0/24"]
        self.heartbeat_interval = 60
        self.heartbeat_jitter = 15
        self.scan_interval = 900
        self.last_scan_time = 0
        self.is_running = True
        
        # Section hashes for Delta updates
        self.inventory_hashes = {
            "hardware": None,
            "software": None,
            "services": None,
            "ports": None,
            "interfaces": None
        }

        self._ensure_identity()

    def _ensure_identity(self):
        """Loads stable Agent ID from disk or generates a new permanent UUID."""
        try:
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, "r") as f:
                    data = json.load(f)
                    self.agent_id = data.get("agent_id")
                    self.auth_token = data.get("auth_token")
                    self.config_version = data.get("config_version", 0)
                    logger.info(f"Loaded existing Agent Identity: {self.agent_id}")
        except Exception as e:
            logger.warning(f"Could not read identity file: {e}")

        if not self.agent_id:
            self.agent_id = str(uuid.uuid4())
            logger.info(f"Generated new Agent Identity: {self.agent_id}")

    def _save_identity(self):
        try:
            os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
            with open(CONFIG_PATH, "w") as f:
                json.dump({
                    "agent_id": self.agent_id,
                    "auth_token": self.auth_token,
                    "config_version": self.config_version
                }, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save identity to {CONFIG_PATH}: {e}")

    def _api_post(self, endpoint: str, payload: dict) -> Optional[dict]:
        url = f"{self.server_url}{endpoint}"
        body_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "RasiSOC-Agent/1.0.0 (Windows)"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as e:
            logger.warning(f"Connection to backend failed ({endpoint}): {e}")
        except Exception as e:
            logger.error(f"API error ({endpoint}): {e}")
        return None

    def _api_get(self, endpoint: str, params: dict = None) -> Optional[dict]:
        url = f"{self.server_url}{endpoint}"
        if params:
            qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
            url = f"{url}?{qs}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "RasiSOC-Agent/1.0.0 (Windows)"}
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"API GET error ({endpoint}): {e}")
        return None

    def register(self) -> bool:
        """Registers the real Windows system with the backend."""
        logger.info(f"Registering agent {self.agent_id} with {self.server_url}...")
        os_info = get_real_os_info()
        hw_info = get_real_hardware_info()
        interfaces = get_real_network_interfaces()

        current_ip = "127.0.0.1"
        mac_addr = "00:00:00:00:00:00"
        for iface in interfaces:
            if iface.get("ip_address") and not iface["ip_address"].startswith("127."):
                current_ip = iface["ip_address"]
                mac_addr = iface.get("mac_address", mac_addr)
                break

        payload = {
            "agent_id": self.agent_id,
            "hostname": os_info["hostname"],
            "computer_name": os_info["computer_name"],
            "os_version": os_info["os_version"],
            "os_build": os_info["os_build"],
            "os_arch": os_info["os_arch"],
            "current_ip": current_ip,
            "mac_address": mac_addr,
            "agent_version": "1.0.0",
            "cpu_model": hw_info.get("cpu_model"),
            "cpu_cores": hw_info.get("cpu_cores"),
            "ram_total_mb": hw_info.get("ram_total_mb"),
            "disk_total_gb": hw_info.get("disk_total_gb"),
            "uptime_sec": get_real_system_health().get("uptime_sec", 0)
        }

        res = self._api_post("/api/v1/agents/register", payload)
        if res and "auth_token" in res:
            self.auth_token = res["auth_token"]
            self.config_version = res.get("config_version", 1)
            self._save_identity()
            logger.info("Agent successfully enrolled and authenticated.")
            return True
        return False

    def sync_config(self):
        """Pulls dynamic discovery configuration and authorized CIDRs."""
        import urllib.parse
        url = f"{self.server_url}/api/v1/agents/config?agent_id={urllib.parse.quote(self.agent_id)}&auth_token={urllib.parse.quote(self.auth_token)}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "RasiSOC-Agent/1.0.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    self.config_version = data.get("version", self.config_version)
                    self.authorized_cidrs = data.get("authorized_cidrs", self.authorized_cidrs)
                    self.heartbeat_interval = data.get("heartbeat_interval_sec", 60)
                    self.scan_interval = data.get("scan_interval_sec", 900)
                    logger.info(f"Synchronized configuration v{self.config_version}. Authorized CIDRs: {self.authorized_cidrs}")
                    self._save_identity()
        except Exception as e:
            logger.warning(f"Error synchronizing config: {e}")

    def send_inventory(self, is_delta: bool = False):
        """Sends real system inventory with delta change detection."""
        os_info = get_real_os_info()
        hw_info = get_real_hardware_info()
        interfaces = get_real_network_interfaces()
        ports = get_real_listening_ports()
        services = get_real_windows_services()
        software = get_real_installed_software()

        current_ip = "127.0.0.1"
        mac_addr = "00:00:00:00:00:00"
        for iface in interfaces:
            if iface.get("ip_address") and not iface["ip_address"].startswith("127."):
                current_ip = iface["ip_address"]
                mac_addr = iface.get("mac_address", mac_addr)
                break

        # Compute section hashes
        def get_hash(obj):
            return hashlib.md5(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()

        h_interfaces = get_hash(interfaces)
        h_ports = get_hash(ports)
        h_services = get_hash(services)
        h_software = get_hash(software)

        # In delta mode, only send sections that changed
        send_interfaces = interfaces if (not is_delta or h_interfaces != self.inventory_hashes["interfaces"]) else None
        send_ports = ports if (not is_delta or h_ports != self.inventory_hashes["ports"]) else None
        send_services = services if (not is_delta or h_services != self.inventory_hashes["services"]) else None
        send_software = software if (not is_delta or h_software != self.inventory_hashes["software"]) else None

        if is_delta and not any([send_interfaces, send_ports, send_services, send_software]):
            logger.info("Inventory unchanged. Zero delta bytes transmitted.")
            return

        payload = {
            "agent_id": self.agent_id,
            "auth_token": self.auth_token,
            "is_delta": is_delta,
            "hostname": os_info["hostname"],
            "current_ip": current_ip,
            "mac_address": mac_addr,
            "hardware": hw_info,
            "interfaces": send_interfaces,
            "ports": send_ports,
            "services": send_services,
            "software": send_software
        }

        res = self._api_post("/api/v1/agents/inventory", payload)
        if res and res.get("status") == "SUCCESS":
            self.inventory_hashes["interfaces"] = h_interfaces
            self.inventory_hashes["ports"] = h_ports
            self.inventory_hashes["services"] = h_services
            self.inventory_hashes["software"] = h_software
            logger.info(f"Inventory transmitted successfully (is_delta={is_delta}).")

    def send_heartbeat(self):
        """Sends lightweight heartbeat with jitter."""
        health = get_real_system_health()
        payload = {
            "agent_id": self.agent_id,
            "auth_token": self.auth_token,
            "agent_version": "1.0.0",
            "status": "healthy",
            "cpu_usage_pct": health["cpu_usage_pct"],
            "ram_usage_pct": health["ram_usage_pct"],
            "disk_usage_pct": health["disk_usage_pct"],
            "uptime_sec": health["uptime_sec"]
        }
        res = self._api_post("/api/v1/agents/heartbeat", payload)
        if res:
            if res.get("action_required") == "UPDATE_CONFIG":
                logger.info("Server flagged configuration update. Refreshing...")
                self.sync_config()

    def run_discovery_pass(self):
        """Performs authorized network discovery."""
        logger.info(f"Executing authorized CIDR discovery sweep over: {self.authorized_cidrs}")
        start_t = time.time()
        devices = perform_authorized_discovery(self.authorized_cidrs)
        duration_ms = int((time.time() - start_t) * 1000)

        if devices:
            payload = {
                "agent_id": self.agent_id,
                "auth_token": self.auth_token,
                "target_subnet": self.authorized_cidrs[0] if self.authorized_cidrs else "192.168.1.0/24",
                "scan_duration_ms": duration_ms,
                "devices": devices
            }
            res = self._api_post("/api/v1/agents/discovery", payload)
            if res:
                logger.info(f"Discovered {len(devices)} active network devices. Ingestion ACK.")
        else:
            logger.info("Discovery complete: 0 active targets identified in ARP scope.")

        self.last_scan_time = time.time()

    def start(self):
        """Main service loop."""
        logger.info("Starting RasiSOC-Agent service...")
        
        # 1. Register or re-authenticate with backend
        registered = False
        while not registered and self.is_running:
            if self.register():
                registered = True
                break
            logger.warning("Enrollment with SOC platform failed. Retrying in 5s...")
            time.sleep(5)

        # 2. Sync config & initial full inventory
        self.sync_config()
        self.send_inventory(is_delta=False)
        self.run_discovery_pass()

        # 3. Continuous operation loop
        last_heartbeat_time = 0
        last_delta_inventory_time = time.time()

        while self.is_running:
            now = time.time()

            # Heartbeat with randomized jitter
            jitter = random.uniform(-self.heartbeat_jitter, self.heartbeat_jitter)
            if now - last_heartbeat_time >= (self.heartbeat_interval + jitter):
                self.send_heartbeat()
                last_heartbeat_time = now

            # Periodic discovery scan
            if now - self.last_scan_time >= self.scan_interval:
                self.run_discovery_pass()

            # Delta inventory check (every 5 minutes)
            if now - last_delta_inventory_time >= 300:
                self.send_inventory(is_delta=True)
                last_delta_inventory_time = now

            time.sleep(1)

def main():
    server = DEFAULT_SERVER_URL
    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        server = sys.argv[1]
    
    agent = RasiSOCAgent(server_url=server)
    try:
        agent.start()
    except KeyboardInterrupt:
        logger.info("Agent service stopped by user.")

if __name__ == "__main__":
    main()
