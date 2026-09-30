import logging
import httpx
from typing import Dict, Any, List
from app.config import settings

logger = logging.getLogger("opensearch_client")

class OpenSearchClient:
    """
    Real REST Client for OpenSearch Security Analytics.
    Zero mock data. Gracefully reports 'unavailable' if unconfigured or offline.
    """

    def __init__(self):
        self.endpoint = settings.OPENSEARCH_URL.rstrip("/") if settings.OPENSEARCH_URL else None

    def is_configured(self) -> bool:
        return bool(self.endpoint)

    async def get_health_status(self) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "unavailable",
                "message": "OpenSearch integration is not configured. Provide OPENSEARCH_URL in settings."
            }

        try:
            async with httpx.AsyncClient(verify=False, timeout=4.0) as client:
                res = await client.get(f"{self.endpoint}/_cluster/health")
                if res.status_code == 200:
                    return {"status": "connected", "cluster": res.json()}
                return {"status": "error", "message": f"OpenSearch HTTP {res.status_code}"}
        except Exception as e:
            return {"status": "unavailable", "message": f"OpenSearch connection failed: {str(e)}"}

    async def query_security_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []

        try:
            async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
                query = {
                    "size": limit,
                    "sort": [{"@timestamp": {"order": "desc"}}],
                    "query": {"match_all": {}}
                }
                res = await client.post(
                    f"{self.endpoint}/wazuh-alerts-*/_search",
                    json=query
                )
                if res.status_code == 200:
                    hits = res.json().get("hits", {}).get("hits", [])
                    return [h.get("_source", {}) for h in hits]
        except Exception as e:
            logger.warning(f"Error querying OpenSearch security index: {e}")

        return []

opensearch_client = OpenSearchClient()
