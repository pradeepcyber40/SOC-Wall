import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Rasi NovaTech SOC Asset Monitoring API"
    APP_ENV: str = os.getenv("APP_ENV", "production")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "rasi-novatech-soc-secret-token-key-production-grade-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # Database: Supports Supabase / PostgreSQL (e.g. postgresql+psycopg://... or postgresql://...)
    # Defaults to SQLite if DATABASE_URL is not set for immediate local developer execution
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./rasi_soc_production.db")
    
    # Redis configuration for background queue & distributed cache
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    ENABLE_REDIS: bool = os.getenv("ENABLE_REDIS", "false").lower() == "true"
    
    # SOC Status Logic thresholds (in seconds)
    HEARTBEAT_TIMEOUT_SEC: int = int(os.getenv("HEARTBEAT_TIMEOUT_SEC", "120")) # 2 mins -> WARNING
    OFFLINE_TIMEOUT_SEC: int = int(os.getenv("OFFLINE_TIMEOUT_SEC", "300"))   # 5 mins -> OFFLINE
    DISCOVERY_STALE_SEC: int = int(os.getenv("DISCOVERY_STALE_SEC", "1800"))  # 30 mins -> UNKNOWN
    
    # External Security Integrations (Wazuh & OpenSearch)
    WAZUH_API_URL: str = os.getenv("WAZUH_API_URL", "")
    WAZUH_USER: str = os.getenv("WAZUH_USER", "")
    WAZUH_PASSWORD: str = os.getenv("WAZUH_PASSWORD", "")
    OPENSEARCH_URL: str = os.getenv("OPENSEARCH_URL", "")
    
    # STRICTLY ZERO MOCK DATA - No synthetic random event generator!
    SIMULATE_LIVE_TELEMETRY: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
