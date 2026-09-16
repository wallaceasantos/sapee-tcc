"""Health check endpoints com métricas do sistema."""

import os
import shutil
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, status
from pydantic import BaseModel

import database

router = APIRouter()

_start_time = time.time()


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    uptime_seconds: float
    database: str
    memory: Optional[dict] = None
    disk: Optional[dict] = None


def _get_memory() -> Optional[dict]:
    try:
        import psutil
        mem = psutil.virtual_memory()
        return {
            "total_mb": round(mem.total / (1024 * 1024), 2),
            "available_mb": round(mem.available / (1024 * 1024), 2),
            "percent_used": mem.percent,
        }
    except Exception:
        return None


def _get_disk() -> Optional[dict]:
    try:
        usage = shutil.disk_usage("/")
        return {
            "total_gb": round(usage.total / (1024 ** 3), 2),
            "free_gb": round(usage.free / (1024 ** 3), 2),
            "percent_used": round((usage.used / usage.total) * 100, 2),
        }
    except Exception:
        return None


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def health_check():
    """Verifica saúde da API e métricas do sistema."""
    db_ok = database.test_connection()

    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        version=os.getenv("APP_VERSION", "1.0.0"),
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptime_seconds=round(time.time() - _start_time, 2),
        database="connected" if db_ok else "disconnected",
        memory=_get_memory(),
        disk=_get_disk(),
    )


@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness_check():
    """Kubernetes-style readiness probe."""
    if database.test_connection():
        return {"ready": True}
    return {"ready": False}


@router.get("/live", status_code=status.HTTP_200_OK)
def liveness_check():
    """Kubernetes-style liveness probe."""
    return {"alive": True}
