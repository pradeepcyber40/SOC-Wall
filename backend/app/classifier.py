from typing import Tuple, Optional, List

# Known MAC OUI prefixes and Vendor Signatures
VENDOR_CATEGORIES = {
    "cisco": ("Switch", 0.75),
    "aruba": ("Access Point", 0.8),
    "ubiquiti": ("Access Point", 0.8),
    "fortinet": ("Firewall", 0.85),
    "palo alto": ("Firewall", 0.85),
    "check point": ("Firewall", 0.85),
    "hikvision": ("Camera", 0.9),
    "axis": ("Camera", 0.9),
    "dahua": ("Camera", 0.9),
    "hanwha": ("Camera", 0.9),
    "canon": ("Printer", 0.85),
    "hp": ("Computer", 0.5), # ambiguous (printer vs computer)
    "epson": ("Printer", 0.85),
    "zebra": ("Printer", 0.9),
    "apple": ("Mobile", 0.6), # could be Mac or iPhone
    "samsung": ("Mobile", 0.7),
    "raspberry pi": ("IoT", 0.85),
    "espressif": ("IoT", 0.9),
    "vmware": ("Server", 0.7),
    "dell": ("Computer", 0.55),
    "lenovo": ("Computer", 0.55),
    "mikrotik": ("Router", 0.8),
    "juniper": ("Router", 0.8),
}

class DeviceClassifier:
    """
    Multi-signal device classification engine.
    Fuses: MAC vendor, hostname, open ports, banners, and SNMP sysDescr.
    """

    @classmethod
    def classify(
        cls,
        mac_vendor: Optional[str] = None,
        hostname: Optional[str] = None,
        open_ports: Optional[List[int]] = None,
        banner: Optional[str] = None,
        snmp_sysdescr: Optional[str] = None,
        is_windows_agent: bool = False
    ) -> Tuple[str, float]:
        if is_windows_agent:
            return ("Computer", 1.0)

        score = 0.0
        candidate = "Unknown"
        signals = []

        m_vendor = (mac_vendor or "").lower()
        h_name = (hostname or "").lower()
        b_text = (banner or "").lower()
        s_desc = (snmp_sysdescr or "").lower()
        ports = set(open_ports or [])

        # 1. SNMP Inspection (Highest confidence signal)
        if s_desc:
            if "switch" in s_desc or "catalyst" in s_desc or "procurve" in s_desc:
                return ("Switch", 0.95)
            if "router" in s_desc or "cisco ios" in s_desc or "junos" in s_desc:
                return ("Router", 0.95)
            if "firewall" in s_desc or "fortigate" in s_desc or "pan-os" in s_desc:
                return ("Firewall", 0.95)
            if "printer" in s_desc or "laserjet" in s_desc:
                return ("Printer", 0.95)
            if "camera" in s_desc or "axis" in s_desc:
                return ("Camera", 0.95)
            if "ap" in s_desc or "access point" in s_desc or "unifi" in s_desc:
                return ("Access Point", 0.95)
            if "linux" in s_desc or "windows server" in s_desc:
                return ("Server", 0.85)

        # 2. Port signatures
        if 554 in ports or 8554 in ports: # RTSP Video streaming
            candidate = "Camera"
            score += 0.5
        if 515 in ports or 631 in ports or 9100 in ports: # IPP / JetDirect
            candidate = "Printer"
            score += 0.6
        if 161 in ports: # SNMP agent active
            score += 0.2
        if 3389 in ports: # RDP
            candidate = "Computer"
            score += 0.4
        if 22 in ports and (80 in ports or 443 in ports):
            if candidate == "Unknown":
                candidate = "Server"
                score += 0.35

        # 3. Hostname heuristics
        if h_name:
            if any(k in h_name for k in ["srv", "dc-", "sql", "db-", "esx", "pve"]):
                candidate = "Server"
                score += 0.4
            elif any(k in h_name for k in ["pc", "desk", "wks"]):
                candidate = "Computer"
                score += 0.4
            elif any(k in h_name for k in ["lap", "lt-", "macbook", "thinkpad"]):
                candidate = "Laptop"
                score += 0.45
            elif any(k in h_name for k in ["cam", "cctv", "nvr", "dvr"]):
                candidate = "Camera"
                score += 0.5
            elif any(k in h_name for k in ["prn", "print", "copier"]):
                candidate = "Printer"
                score += 0.55
            elif any(k in h_name for k in ["sw-", "switch"]):
                candidate = "Switch"
                score += 0.55
            elif any(k in h_name for k in ["rt-", "router", "gw-"]):
                candidate = "Router"
                score += 0.55
            elif any(k in h_name for k in ["fw-", "firewall"]):
                candidate = "Firewall"
                score += 0.6
            elif any(k in h_name for k in ["ap-", "wifi", "wap"]):
                candidate = "Access Point"
                score += 0.5

        # 4. MAC Vendor OUI matching
        for vendor_key, (cat_guess, weight) in VENDOR_CATEGORIES.items():
            if vendor_key in m_vendor:
                if candidate == "Unknown" or candidate == cat_guess:
                    candidate = cat_guess
                    score += weight
                else:
                    # Resolve conflict
                    if weight > score:
                        candidate = cat_guess
                        score = weight
                break

        # Confidence normalization
        final_confidence = min(1.0, max(0.0, score))
        if final_confidence < 0.4:
            return ("Unknown", round(final_confidence, 2))

        return (candidate, round(final_confidence, 2))
