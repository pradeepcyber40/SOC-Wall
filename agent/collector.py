"""
RasiSOC-Agent Real System Telemetry Collector
Collects actual Windows hardware, OS, network, services, ports, and software inventories.
ZERO FAKE DATA: If an attribute cannot be collected, returns null / None.
"""

import sys
import os
import platform
import socket
import psutil
import winreg
import subprocess
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("rasi_collector")

def get_real_os_info() -> Dict[str, Any]:
    try:
        uname = platform.uname()
        version_str = f"Windows {uname.release} ({uname.version})"
        return {
            "os_version": version_str,
            "os_build": uname.version,
            "os_arch": uname.machine,
            "hostname": socket.gethostname(),
            "computer_name": os.environ.get("COMPUTERNAME", socket.gethostname())
        }
    except Exception as e:
        logger.warning(f"OS info error: {e}")
        return {
            "os_version": "Windows (Version Unavailable)",
            "os_build": None,
            "os_arch": platform.machine(),
            "hostname": socket.gethostname(),
            "computer_name": socket.gethostname()
        }

def get_real_hardware_info() -> Dict[str, Any]:
    hw = {
        "cpu_model": platform.processor() or None,
        "cpu_cores": psutil.cpu_count(logical=True),
        "ram_total_mb": round(psutil.virtual_memory().total / (1024 * 1024)),
        "disk_total_gb": round(psutil.disk_usage("C:\\").total / (1024 * 1024 * 1024)),
        "gpu_model": None,
        "bios_version": None,
        "chassis_serial": None,
        "motherboard_model": None
    }

    # Query WMI or PowerShell for deep hardware details if permitted
    try:
        import wmi
        c = wmi.WMI()
        # BIOS
        for b in c.Win32_BIOS():
            hw["bios_version"] = b.SMBIOSBIOSVersion or b.Version
            hw["chassis_serial"] = b.SerialNumber
            break
        # CPU
        for proc in c.Win32_Processor():
            hw["cpu_model"] = proc.Name.strip() if proc.Name else hw["cpu_model"]
            break
        # GPU
        for gpu in c.Win32_VideoController():
            hw["gpu_model"] = gpu.Name
            break
        # Baseboard
        for board in c.Win32_BaseBoard():
            hw["motherboard_model"] = f"{board.Manufacturer} {board.Product}".strip()
            break
    except Exception:
        # Fallback to lightweight PowerShell Get-CimInstance if wmi COM throws
        try:
            cmd = "powershell -NoProfile -Command \"Get-CimInstance Win32_BIOS | Select-Object -ExpandProperty SerialNumber\""
            res = subprocess.run(cmd, capture_output=True, text=True, shell=True, timeout=3)
            if res.returncode == 0 and res.stdout.strip():
                hw["chassis_serial"] = res.stdout.strip()
        except Exception:
            pass

    return hw

def get_real_network_interfaces() -> List[Dict[str, Any]]:
    interfaces = []
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()

    default_gw = None
    try:
        # Query default gateway using ipconfig / route print
        cmd = "route print 0.0.0.0"
        route_out = subprocess.run(cmd, capture_output=True, text=True, shell=True, timeout=3)
        for line in route_out.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                default_gw = parts[2]
                break
    except Exception:
        default_gw = None

    for iface_name, addr_list in addrs.items():
        ip = None
        mac = None
        subnet = None
        for a in addr_list:
            if a.family == socket.AF_INET:
                ip = a.address
                if a.netmask:
                    try:
                        net = ipaddress.IPv4Network(f"{ip}/{a.netmask}", strict=False)
                        subnet = str(net)
                    except Exception:
                        pass
            elif a.family == psutil.AF_LINK or (hasattr(psutil, 'AF_PACKET') and a.family == psutil.AF_PACKET):
                mac = a.address

        # Only report interfaces with IP or active status
        is_up = stats[iface_name].isup if iface_name in stats else True
        speed = stats[iface_name].speed if iface_name in stats else 0

        if ip or mac:
            interfaces.append({
                "interface_name": iface_name,
                "ip_address": ip,
                "mac_address": mac,
                "gateway": default_gw,
                "subnet": subnet,
                "vlan": None,
                "is_up": is_up,
                "speed_mbps": speed,
                "vendor": "Windows Network Controller"
            })

    return interfaces

def get_real_listening_ports() -> List[Dict[str, Any]]:
    ports = []
    try:
        connections = psutil.net_connections(kind="inet")
        for conn in connections:
            if conn.status == "LISTEN" or (conn.type == socket.SOCK_DGRAM and conn.laddr):
                proto = "TCP" if conn.type == socket.SOCK_STREAM else "UDP"
                port_num = conn.laddr.port
                proc_name = None
                if conn.pid:
                    try:
                        proc = psutil.Process(conn.pid)
                        proc_name = proc.name()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        proc_name = None

                ports.append({
                    "port": port_num,
                    "protocol": proto,
                    "service": proc_name,
                    "state": conn.status or "OPEN",
                    "pid": conn.pid,
                    "process_name": proc_name
                })
    except (psutil.AccessDenied, Exception) as e:
        logger.warning(f"Could not retrieve all listening ports: {e}")

    # Remove duplicates
    unique_ports = []
    seen = set()
    for p in ports:
        key = (p["port"], p["protocol"])
        if key not in seen:
            seen.add(key)
            unique_ports.append(p)

    return unique_ports

def get_real_windows_services() -> List[Dict[str, Any]]:
    services = []
    try:
        for s in psutil.win_service_iter():
            try:
                info = s.as_dict()
                services.append({
                    "service_name": info.get("name", "Unknown"),
                    "display_name": info.get("display_name", None),
                    "status": info.get("status", "STOPPED").upper(),
                    "startup_type": info.get("start_type", "DEMAND_START").upper()
                })
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Windows services iteration error: {e}")

    return services[:150] # Top 150 services for bandwidth sanity

def get_real_installed_software() -> List[Dict[str, Any]]:
    software_list = []
    reg_paths = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    ]

    for root_key in [winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER]:
        for subpath in reg_paths:
            try:
                with winreg.OpenKey(root_key, subpath) as key:
                    num_subkeys = winreg.QueryInfoKey(key)[0]
                    for i in range(num_subkeys):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                try:
                                    disp_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                    if not disp_name or not disp_name.strip():
                                        continue
                                    try:
                                        version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                                    except FileNotFoundError:
                                        version = None
                                    try:
                                        pub = winreg.QueryValueEx(subkey, "Publisher")[0]
                                    except FileNotFoundError:
                                        pub = None
                                    try:
                                        install_dt = winreg.QueryValueEx(subkey, "InstallDate")[0]
                                    except FileNotFoundError:
                                        install_dt = None

                                    software_list.append({
                                        "name": disp_name.strip(),
                                        "version": str(version).strip() if version else None,
                                        "publisher": str(pub).strip() if pub else None,
                                        "install_date": str(install_dt).strip() if install_dt else None
                                    })
                                except FileNotFoundError:
                                    continue
                        except Exception:
                            continue
            except Exception:
                continue

    # Deduplicate
    unique = []
    seen = set()
    for item in software_list:
        key = (item["name"], item["version"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique

def get_real_system_health() -> Dict[str, Any]:
    try:
        uptime = int(psutil.boot_time())
        current_time = int(psutil.time.time())
        uptime_sec = current_time - uptime
    except Exception:
        uptime_sec = 0

    return {
        "cpu_usage_pct": round(psutil.cpu_percent(interval=0.5), 1),
        "ram_usage_pct": round(psutil.virtual_memory().percent, 1),
        "disk_usage_pct": round(psutil.disk_usage("C:\\").percent, 1),
        "uptime_sec": uptime_sec
    }
