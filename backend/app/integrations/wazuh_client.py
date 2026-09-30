import logging
import httpx
from typing import Dict, Any, List
from app.config import settings

logger = logging.getLogger("wazuh_client")

class WazuhClient:
    """
    Real REST Client for Wazuh Manager API.
    Zero mock data. Gracefully reports 'unavailable' if credentials or server are offline.
    """

    def __init__(self):
        self.api_url = settings.WAZUH_API_URL.rstrip("/") if settings.WAZUH_API_URL else None
        self.user = settings.WAZUH_USER
        self.password = settings.WAZUH_PASSWORD
        self._jwt_token = None

    def is_configured(self) -> bool:
        return bool(self.api_url and self.user and self.password)

    async def get_health_status(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "unavailable",
                "message": "Wazuh integration is not configured. Provide WAZUH_API_URL and credentials in settings."
            }

        try:
            async with httpx.AsyncClient(verify=False, timeout=4.0) as client:
                res = await client.get(f"{self.api_url}/manager/status")
                if res.status_code == 200:
                    return {"status": "connected", "details": res.json()}
                return {"status": "error", "message": f"Wazuh responded with status {res.status_code}"}
        except Exception as e:
            return {"status": "unavailable", "message": f"Wazuh connection failed: {str(e)}"}

    async def fetch_security_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Queries real security alerts from Wazuh Manager."""
        if not self.is_configured():
            return []

        try:
            async with httpx.AsyncClient(verify=False, timeout=6.0) as client:
                # Wazuh Token Authentication
                auth_res = await client.post(
                    f"{self.api_url}/security/user/authenticate",
                    auth=(self.user, self.password)
                )
                if auth_res.status_code != 200:
                    logger.warning("Failed to authenticate with Wazuh API")
                    return []
                token = auth_res.json().get("data", {}).get("token")

                alerts_res = await client.get(
                    f"{self.api_url}/alerts?limit={limit}&sort=-timestamp",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if alerts_res.status_code == 200:
                    return alerts_res.json().get("data", {}).get("affected_items", [])
        except Exception as e:
            logger.warning(f"Error querying Wazuh alerts: {e}")

        return []

wazuh_client = WazuhClient()
