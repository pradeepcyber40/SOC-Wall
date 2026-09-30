import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.websocket_hub import hub
from app.real_watchdog import real_agent_watchdog_loop

from app.routers import (
    auth_routes,
    kpi_routes,
    category_routes,
    asset_routes,
    alert_routes,
    network_routes,
    brand_routes,
    admin_routes,
    audit_routes,
    agent_routes,
    discovery_routes
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rasi_soc_api")

watchdog_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global watchdog_task
    logger.info("Initializing Rasi NovaTech SOC Database & Models...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize baseline Admin accounts & Discovery Ranges if empty (ZERO mock assets!)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    # Launch real background watchdog for heartbeat timeouts
    watchdog_task = asyncio.create_task(real_agent_watchdog_loop())
    logger.info("Real SOC Watchdog background loop started.")
    
    yield
    
    if watchdog_task:
        watchdog_task.cancel()
        try:
            await watchdog_task
        except asyncio.CancelledError:
            pass
    logger.info("SOC API server shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-grade SOC Asset Monitoring, Real Agent Ingestion and Incident Response API",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_routes.router)
app.include_router(agent_routes.router)
app.include_router(discovery_routes.router)
app.include_router(kpi_routes.router)
app.include_router(category_routes.router)
app.include_router(asset_routes.router)
app.include_router(alert_routes.router)
app.include_router(network_routes.router)
app.include_router(brand_routes.router)
app.include_router(admin_routes.router)
app.include_router(audit_routes.router)

# Real-time SOC WebSocket Gateway
@app.websocket("/ws/soc-feed")
async def websocket_soc_feed(websocket: WebSocket):
    await hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(websocket)
    except Exception as e:
        hub.disconnect(websocket)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": "CONNECTED",
        "mock_telemetry_active": False
    }

@app.get("/ready")
def readiness_check():
    # Verify DB connectivity
    try:
        db = SessionLocal()
        db.execute(Base.metadata.tables["users"].select().limit(1))
        db.close()
        return {"status": "READY", "load_balancer_action": "ROUTE_TRAFFIC"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "UNREADY", "reason": str(e)})
