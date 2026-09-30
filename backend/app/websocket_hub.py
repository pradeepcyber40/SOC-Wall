from typing import List, Dict, Any
from fastapi import WebSocket
import json
import logging
from datetime import datetime

logger = logging.getLogger("soc_websocket")

class WebSocketHub:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.recent_events: List[Dict[str, Any]] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")
        
        # Send initial connection acknowledgment with current timestamp
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "data": {
                "message": "Connected to Rasi NovaTech SOC Telemetry Gateway",
                "timestamp": datetime.utcnow().isoformat(),
                "active_clients": len(self.active_connections)
            }
        }))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast_event(self, event_type: str, data: Any):
        """
        Event types:
        - SOC_EVENT: live log item e.g. [ONLINE], [ALERT], [SECURITY]
        - KPI_UPDATE: top cards updated
        - ASSET_STATUS_CHANGE: specific asset changed status
        - CATEGORY_UPDATE: categories summary updated
        - NEW_ALERT: incoming Wazuh/OpenSearch alert
        """
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Save last 50 events in memory
        if event_type == "SOC_EVENT":
            self.recent_events.append(data)
            if len(self.recent_events) > 50:
                self.recent_events.pop(0)

        message_str = json.dumps(payload, default=str)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

hub = WebSocketHub()
