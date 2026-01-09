"""
Query Poller Router - Control the background query polling service
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.query_poller import get_poller
import logging

logger = logging.getLogger("query_poller_router")

router = APIRouter(prefix="/query-poller")

class PollerConfigUpdate(BaseModel):
    """Configuration update for the poller"""
    interval_seconds: int = 45

@router.get("/status")
async def get_poller_status():
    """Get current status of the query poller"""
    poller = get_poller()
    return poller.get_status()

@router.post("/execute-now")
async def execute_query_now():
    """Manually trigger a single query execution"""
    try:
        poller = get_poller()
        poller.execute_slow_query()
        return {
            "success": True,
            "message": "Query executed successfully",
            "stats": poller.get_status()
        }
    except Exception as e:
        logger.error(f"Manual execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_poller():
    """Stop the background query poller"""
    from main import scheduler
    poller = get_poller()
    
    if scheduler and scheduler.running:
        scheduler.pause() # Pause instead of shutdown to avoid lifespan issues
        poller.is_running = False
        return {"success": True, "message": "Query poller paused successfully"}
    
    poller.is_running = False
    return {"success": True, "message": "Query poller already stopped or not controlled by scheduler"}

@router.post("/start")
async def start_poller():
    """Resume the background query poller"""
    from main import scheduler
    poller = get_poller()
    
    if scheduler:
        scheduler.resume()
        poller.is_running = True
        return {"success": True, "message": "Query poller resumed successfully"}
    
    return {"success": False, "message": "Scheduler not initialized"}

@router.get("/health")
async def poller_health():
    """Health check for the poller service"""
    poller = get_poller()
    status = poller.get_status()
    
    return {
        "healthy": status["error_count"] < 10,  # Tolerate some errors
        "is_running": status["is_running"],
        "execution_count": status["execution_count"],
        "error_count": status["error_count"]
    }
