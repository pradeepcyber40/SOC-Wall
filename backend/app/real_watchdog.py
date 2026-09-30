import asyncio
import logging
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Agent, Asset
from app.websocket_hub import hub
from app.config import settings

logger = logging.getLogger("soc_watchdog")

async def real_agent_watchdog_loop():
    """
    Real-time SOC Watchdog:
    Periodically inspects REAL agent and asset heartbeat ages.
    Does NOT generate fake events or synthetic records.
    If an agent misses heartbeats beyond configured thresholds:
    Transitions state: ONLINE -> WARNING -> OFFLINE and broadcasts WebSocket event.
    """
    logger.info("Real SOC Watchdog initialized (Monitoring live heartbeats & timeouts).")
    await asyncio.sleep(5)

    while True:
        try:
            await asyncio.sleep(15) # Check every 15 seconds
            db = SessionLocal()
            try:
                from datetime import timezone
                now = datetime.now(timezone.utc)
                warning_threshold = now - timedelta(seconds=settings.HEARTBEAT_TIMEOUT_SEC)
                offline_threshold = now - timedelta(seconds=settings.OFFLINE_TIMEOUT_SEC)

                # Check agents for timeout
                agents = db.query(Agent).all()
                for agent in agents:
                    old_status = agent.status
                    hb = agent.last_heartbeat
                    if hb and hb.tzinfo is None:
                        hb = hb.replace(tzinfo=timezone.utc)

                    if hb and hb < offline_threshold and agent.status != "OFFLINE":
                        agent.status = "OFFLINE"
                        logger.warning(f"Agent {agent.hostname} marked OFFLINE (No heartbeat since {agent.last_heartbeat})")
                        await hub.broadcast_event("AGENT_OFFLINE", {
                            "agent_id": agent.agent_id,
                            "hostname": agent.hostname,
                            "timestamp": now.isoformat()
                        })
                    elif hb and hb < warning_threshold and agent.status == "ONLINE":
                        agent.status = "WARNING"
                        logger.warning(f"Agent {agent.hostname} marked WARNING (Delayed heartbeat)")

                    # Sync associated asset status
                    if old_status != agent.status:
                        asset = db.query(Asset).filter(Asset.agent_id == agent.agent_id).first()
                        if asset:
                            asset.status = agent.status
                            await hub.broadcast_event(f"ASSET_{agent.status}", {
                                "asset_id": asset.asset_id,
                                "hostname": asset.hostname,
                                "status": agent.status
                            })

                db.commit()

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error in watchdog loop: {e}")
            await asyncio.sleep(10)
