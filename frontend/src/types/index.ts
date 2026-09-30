export interface AssetItem {
  asset_id: string;
  id?: string;
  agent_id?: string;
  hostname: string;
  ip_address: string;
  mac_address: string;
  category: string;
  manufacturer: string;
  model: string;
  os: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | 'WARNING';
  risk: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  first_seen: string;
  last_seen: string;
  last_heartbeat: string;
  agent_status: 'Active' | 'Disconnected' | 'Unmanaged';
  agent_version: string;
  subnet: string;
  vlan: string;
  network_vendor: string;
  is_authorized: boolean;
  discovery_status: string;
  network_availability_pct: number;
}

export interface HardwareDetail {
  cpu: string;
  ram_gb: number;
  storage_gb: number;
  gpu: string;
  bios: string;
  serial_number: string;
}

export interface NetworkInterfaceDetail {
  interface_name: string;
  ip_address: string;
  mac_address: string;
  gateway: string;
  subnet: string;
  vlan: string;
  vendor: string;
}

export interface ServiceDetail {
  service_name: string;
  status: string;
  version: string;
  startup_type: string;
}

export interface PortDetail {
  port: number;
  protocol: string;
  service: string;
  state: string;
  last_detected: string;
}

export interface SoftwareDetail {
  software_name: string;
  version: string;
  publisher: string;
  installed_date: string;
}

export interface SecurityAlertItem {
  alert_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  asset_id: string;
  asset_hostname: string;
  source: string;
  alert_type: string;
  description: string;
  timestamp: string;
  status: 'New' | 'Investigating' | 'Acknowledged' | 'Resolved';
  assigned_analyst: string;
}

export interface AssetDetailResponse {
  overview: AssetItem;
  hardware?: HardwareDetail;
  network: NetworkInterfaceDetail[];
  services: ServiceDetail[];
  ports: PortDetail[];
  software: SoftwareDetail[];
  security_alerts: SecurityAlertItem[];
}

export interface CategorySummary {
  category: string;
  total: number;
  online: number;
  offline: number;
  percentage_online: number;
  risk: string;
  last_updated: string;
}

export interface KPISummary {
  total_assets: number;
  online_assets: number;
  offline_assets: number;
  security_alerts: number;
  critical_alerts: number;
  unknown_assets: number;
  warning_assets: number;
  last_updated: string;
}

export interface SubnetItem {
  cidr: string;
  name: string;
  vlan: string;
  gateway: string;
  total_possible: number;
  discovered: number;
  online: number;
  offline: number;
  unknown: number;
  network_devices: number;
  location: string;
}

export interface BrandItem {
  brand: string;
  count: number;
  online: number;
  offline: number;
  risk_summary: string;
}

export interface AuditLogItem {
  id: number;
  user: string;
  action: string;
  resource: string;
  ip: string;
  timestamp: string;
  result: string;
  details: string;
}

export interface UserItem {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'Super Admin' | 'SOC Admin' | 'SOC Analyst' | 'Viewer';
  is_active: boolean;
  created_at: string;
}

export interface SOCLiveEvent {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';
  asset_id: string;
  hostname: string;
  message: string;
  timestamp: string;
  raw_timestamp?: string;
}
