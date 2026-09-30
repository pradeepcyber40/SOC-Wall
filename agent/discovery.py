"""
RasiSOC-Agent Authorized Network Discovery Engine
Performs strictly authorized, lightweight discovery only within admin-configured CIDRs.
Uses local ARP table sweeps, ICMP reachability, and lightweight banner probes.
"""

import socket
import ipaddress
import subprocess
import re
import time
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("rasi_discovery")

# Common lightweight probe ports to assist classification without aggressive scanning
LIGHTWEIGHT_PROBE_PORTS = [80, 443, 22, 445, 554, 9100, 161]

def get_arp_table_entries() -> Dict[str, str]:
    """Reads real Windows ARP cache using `arp -a`."""
    entries = {}
    try:
        res = subprocess.run("arp -a", capture_output=True, text=True, shell=True, timeout=5)
        for line in res.stdout.splitlines():
            # Matches IP and physical address format: 192.168.1.1   00-50-56-c0-00-08   dynamic
            match = re.search(r"(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F\-]{17})", line)
            if match:
                ip = match.group(1)
                mac = match.group(2).replace("-", ":").upper()
                if not ip.startswith("224.") and not ip.startswith("255."):
                    entries[ip] = mac
    except Exception as e:
        logger.warning(f"Error reading ARP cache: {e}")
    return entries

def resolve_hostname(ip: str) -> Optional[str]:
    try:
        host, _, _ = socket.gethostbyaddr(ip)
        return host
    except Exception:
        return None

def probe_lightweight_ports(ip: str, timeout: float = 0.3) -> List[int]:
    open_ports = []
    for port in LIGHTWEIGHT_PROBE_PORTS:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            res = s.connect_ex((ip, port))
            if res == 0:
                open_ports.append(port)
        except Exception:
            pass
        finally:
            s.close()
    return open_ports

def perform_authorized_discovery(
    authorized_cidrs: List[str],
    max_hosts_per_pass: int = 30
) -> List[Dict[str, Any]]:
    """
    Sweeps authorized subnets using lightweight ARP + socket reachability.
    Strictly constrained to authorized_cidrs.
    """
    discovered_devices = []
    arp_cache = get_arp_table_entries()

    for cidr in authorized_cidrs:
        try:
            network = ipaddress.IPv4Network(cidr, strict=False)
        except ValueError:
            logger.warning(f"Invalid authorized CIDR: {cidr}")
            continue

        # 1. Match against known ARP entries in this subnet
        for ip_str, mac in arp_cache.items():
            try:
                ip_obj = ipaddress.IPv4Address(ip_str)
                if ip_obj in network:
                    hostname = resolve_hostname(ip_str)
                    ports = probe_lightweight_ports(ip_str, timeout=0.25)
                    discovered_devices.append({
                        "ip_address": ip_str,
                        "mac_address": mac,
                        "hostname": hostname,
                        "mac_vendor": "Discovered Host",
                        "probe_method": "ARP",
                        "open_ports": ports,
                        "banner": None,
                        "snmp_sysdescr": None
                    })
            except Exception:
                continue

    return discovered_devices
