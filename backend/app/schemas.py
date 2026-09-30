from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str

# --- Real Agent Communication Schemas ---
class AgentRegisterRequest(BaseModel):
    agent_id: str
    hostname: str
    computer_name: Optional[str] = None
    os_version: str
    os_build: Optional[str] = None
    os_arch: Optional[str] = None
    current_ip: str
    mac_address: str
    agent_version: str = "1.0.0"
    cpu_model: Optional[str] = None
    cpu_cores: Optional[int] = None
    ram_total_mb: Optional[int] = None
    disk_total_gb: Optional[int] = None
    uptime_sec: Optional[int] = None

class AgentRegisterResponse(BaseModel):
    agent_id: str
    auth_token: str
    config_version: int
    status: str
    message: str

class AgentHeartbeatRequest(BaseModel):
    agent_id: str
    auth_token: str
    agent_version: str = "1.0.0"
    status: str = "healthy"
    cpu_usage_pct: Optional[float] = None
    ram_usage_pct: Optional[float] = None
    disk_usage_pct: Optional[float] = None
    uptime_sec: Optional[int] = None
    timestamp: Optional[datetime] = None

class AgentHeartbeatResponse(BaseModel):
    status: str
    current_config_version: int
    action_required: Optional[str] = None # e.g. "UPDATE_CONFIG"

class AgentConfigResponse(BaseModel):
    version: int
    heartbeat_interval_sec: int
    heartbeat_jitter_sec: int
    discovery_enabled: bool
    authorized_cidrs: List[str]
    scan_interval_sec: int
    scan_jitter_sec: int
    max_packet_rate: int
    enable_snmp: bool
    snmp_community: str

# Inventory Models from Agent
class NetworkInterfaceItem(BaseModel):
    interface_name: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    gateway: Optional[str] = None
    subnet: Optional[str] = None
    vlan: Optional[str] = None
    is_up: bool = True
    speed_mbps: Optional[int] = None
    vendor: Optional[str] = None

    class Config:
        from_attributes = True

class SoftwareItem(BaseModel):
    name: str
    version: Optional[str] = None
    publisher: Optional[str] = None
    install_date: Optional[str] = None

    class Config:
        from_attributes = True

class ServiceItem(BaseModel):
    service_name: str
    display_name: Optional[str] = None
    status: str
    startup_type: Optional[str] = None

    class Config:
        from_attributes = True

class PortItem(BaseModel):
    port: int
    protocol: str = "TCP"
    service: Optional[str] = None
    state: str = "LISTEN"
    pid: Optional[int] = None
    process_name: Optional[str] = None

    class Config:
        from_attributes = True

class HardwareInfoPayload(BaseModel):
    cpu_model: Optional[str] = None
    cpu_cores: Optional[int] = None
    ram_total_mb: Optional[int] = None
    disk_total_gb: Optional[int] = None
    gpu_model: Optional[str] = None
    bios_version: Optional[str] = None
    chassis_serial: Optional[str] = None
    motherboard_model: Optional[str] = None

class AgentInventoryRequest(BaseModel):
    agent_id: str
    auth_token: str
    is_delta: bool = False
    hostname: str
    current_ip: str
    mac_address: str
    hardware: Optional[HardwareInfoPayload] = None
    interfaces: Optional[List[NetworkInterfaceItem]] = None
    software: Optional[List[SoftwareItem]] = None
    services: Optional[List[ServiceItem]] = None
    ports: Optional[List[PortItem]] = None

# Discovery Batch Ingestion
class DiscoveredDeviceItem(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    mac_vendor: Optional[str] = None
    probe_method: str = "ARP"
    open_ports: Optional[List[int]] = None
    banner: Optional[str] = None
    snmp_sysdescr: Optional[str] = None

class AgentDiscoveryBatchRequest(BaseModel):
    agent_id: str
    auth_token: str
    target_subnet: str
    scan_duration_ms: Optional[int] = None
    devices: List[DiscoveredDeviceItem]

# --- Dashboard & Asset Schemas ---
class AssetItem(BaseModel):
    asset_id: str
    agent_id: Optional[str] = None
    hostname: str
    ip_address: str
    mac_address: str
    category: str
    manufacturer: str
    model: str
    os: str
    status: str
    risk: str
    classification_confidence: float
    subnet: Optional[str] = None
    vlan: Optional[str] = None
    network_vendor: Optional[str] = None
    is_managed: bool
    discovery_method: str
    first_seen: datetime
    last_seen: datetime
    last_heartbeat: Optional[datetime] = None

    class Config:
        from_attributes = True

class AssetListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AssetItem]

class AssetDetailResponse(BaseModel):
    overview: AssetItem
    hardware: Optional[Dict[str, Any]] = None
    network: List[NetworkInterfaceItem] = []
    services: List[ServiceItem] = []
    ports: List[PortItem] = []
    software: List[SoftwareItem] = []
    security_alerts: List[Any] = []

class CategorySummary(BaseModel):
    category: str
    total: int
    online: int
    offline: int
    unknown: int
    percentage_online: float
    risk: str
    last_updated: str

class KPISummary(BaseModel):
    total_assets: int
    online_assets: int
    offline_assets: int
    unknown_assets: int
    warning_assets: int
    security_alerts: int
    critical_alerts: int
    last_updated: datetime

class DiscoveryRangeCreate(BaseModel):
    cidr: str
    name: str
    scan_interval_sec: int = 900
    scan_jitter_sec: int = 30
    max_packet_rate: int = 100
    snmp_community: str = "public"

class DiscoveryConfigResponse(BaseModel):
    version: int
    ranges: List[Dict[str, Any]]
    global_config: Dict[str, Any]

class AuditLogItem(BaseModel):
    id: int
    user: str
    action: str
    resource: str
    ip: str
    timestamp: datetime
    result: str
    details: Optional[str] = None

class AuditLogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AuditLogItem]
