# Rasi NovaTech SOC Asset Monitoring & Defense Wall

Production-grade Security Operations Center (SOC) Asset Monitoring Admin Dashboard designed for continuous real-time discovery, classification, and incident response across corporate networks and Windows endpoints.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |   Rasi NovaTech SOC Wall (React TS)   |
                      |   Dark Cyber UI / Tailwind / Recharts |
                      +-------------------+-------------------+
                                          |
                        REST APIs & WebSocket Telemetry Stream
                                          |
                      +-------------------+-------------------+
                      |      FastAPI SOC Backend Gateway      |
                      |  - Multi-factor Status Logic Engine   |
                      |  - JWT RBAC Enforcement Middleware   |
                      |  - Server-side Pagination & Filter    |
                      |  - WebSocket Event Hub & Streamer     |
                      +-------------------+-------------------+
                                          |
                      +-------------------+-------------------+
                      |   SQLAlchemy ORM Data Repository      |
                      |   - PostgreSQL / SQLite Engine        |
                      |   - 1,000+ Pre-seeded Assets          |
                      |   - Hardware, Ports, Services, CVEs   |
                      |   - Wazuh Alerts & OpenSearch Logs    |
                      +---------------------------------------+
```

---

## Key Features

1. **Top KPI Metrics (Real-Time WebSocket Updates)**:
   - **Total Assets**: 1,000
   - **Online Assets**: 934 (Green glow heartbeat)
   - **Offline Assets**: 66 (Warning / Timeout)
   - **Security Alerts**: 18
   - **Critical Alerts**: 2 (Urgent crimson pulsing badge)
   - **Unknown Assets**: 12 (Unprofiled / Quarantine)

2. **Asset Category Fleet Matrix (Primary Dashboard Component)**:
   - Row-by-row telemetry for 13 device categories: *Computers, Laptops, Mobile, Servers, Routers, Switches, Firewalls, Printers, Cameras, Access Points, IoT, Other, Unknown*.
   - Real-time online percentage visual meters and risk classification badges.
   - Interactive row click instantly navigates to filtered inventory.

3. **Live SOC Telemetry Stream**:
   - Real-time incremental WebSocket feed:
     * `[ONLINE] Laptop LT-102 detected on 192.168.2.0/24`
     * `[OFFLINE] Camera CAM-018 probe timeout`
     * `[ALERT] RDP port 3389 inbound connection detected`
     * `[NEW ASSET] New authorized network asset discovered via ARP scan`
     * `[SECURITY] High severity Wazuh event: Rule 5710 (SSH Brute Force)`
   - Filter by type, pause/resume, clear buffer, and optional synthesized tactical audio chirps.

4. **Multi-Factor Status Logic Engine**:
   - Status is NOT evaluated from a single ping or request.
   - Fuses: `last_heartbeat`, `last_seen`, `discovery_status`, `agent_status` (Active, Disconnected, Unmanaged), `network_availability_pct`, and category timeouts.
   - Output states: `ONLINE`, `OFFLINE`, `UNKNOWN`, `WARNING`.

5. **Server-Side Paginated Asset Inventory**:
   - Supports 1,000+ assets with instant debounced search.
   - Multi-column filtering (Category, Status, Vendor, Risk, Subnet).
   - Column visibility toggle and one-click CSV export.

6. **Deep Asset Inspection (7-Tab Drawer)**:
   - **Overview**: Hostname, IP, MAC, Category (editable by Admins), Risk score, Wazuh agent version.
   - **Hardware**: CPU, RAM, NVMe storage, GPU, BIOS, Serial number.
   - **Network**: Multi-NIC interfaces, IP, Gateway, Subnet, VLAN, Hardware vendor.
   - **Services**: Windows & Linux daemons, status, version, startup type.
   - **Ports**: Discovered TCP/UDP listening ports, state, protocol, detection timestamp.
   - **Software**: Wazuh Syscollector software inventory, version, publisher, install date.
   - **Security**: Wazuh security incidents, MITRE ATT&CK techniques, risk severity.

7. **Network Topology & Subnets**:
   - Monitored CIDR subnets (192.168.1.0/24, 192.168.2.0/24, 10.0.10.0/24, 10.0.20.0/24, 172.16.50.0/24, 172.16.60.0/24).
   - Capacity meter (254 possible addresses), discovered, online, offline, unknown, and network devices count.

8. **Brand Distribution**:
   - Breakdown across Dell, HP, Lenovo, Cisco, Hikvision, Fortinet, Apple, and others.
   - Interactive vendor filter links.

9. **Security Alerts Queue**:
   - Wazuh & OpenSearch integration with severity breakdown (Critical, High, Medium, Low, Informational).
   - Triage workflow: Acknowledge, Assign Analyst, Resolve, and Inspect Asset.

10. **RBAC & Administration**:
    - 4 distinct operator personas: `Super Admin`, `SOC Admin`, `SOC Analyst`, `Viewer`.
    - Permissions validated and enforced by FastAPI backend.
    - User management, discovery IP ranges, scan frequencies, and Wazuh/OpenSearch API configs.

11. **Immutable Audit Trail**:
    - Comprehensive regulatory audit logging recording Operator, Action, Resource target, Origin IP, Timestamp, and Outcome.

---

## Running the Application

### 1. Backend Server (FastAPI)
```powershell
cd r:\discover\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- API Docs & Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- WebSocket Feed: `ws://127.0.0.1:8000/ws/soc-feed`

### 2. Frontend Dashboard (React + TypeScript + Vite)
```powershell
cd r:\discover\frontend
npm run dev -- --host
```
- Dashboard URL: `http://localhost:5173/`

---

## Default RBAC Credentials (Persona Switcher Included)
- **Super Admin**: `superadmin` / `password123` (Full control)
- **SOC Admin**: `socadmin` / `password123` (Configuration & Triage)
- **SOC Analyst**: `analyst1` / `password123` (Incident Triage & Investigation)
- **Viewer**: `viewer` / `password123` (Read-only auditor)
*(Use the persona switcher in the top right navbar to test role enforcement)*
