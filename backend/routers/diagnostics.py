from fastapi import APIRouter
import os
import deps
from services.diagnostic import DiagnosticService

router = APIRouter()

@router.get("/logs")
async def get_logs(lines: int = 200):
    """Get last N lines of server logs"""
    log_file = "server.log"
    # Assuming log file is in root backend dir (parent of routers)
    # But since we run from backend/, it should be there.
    if not os.path.exists(log_file):
         # Try looking one directory up just in case
        if os.path.exists(os.path.join("..", log_file)):
            log_file = os.path.join("..", log_file)
        else:
            return {"logs": ["Log file not found."]}
    
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            # Clean lines and reverse to show newest first if needed, or just tail
            return {"logs": [l.rstrip() for l in all_lines[-lines:]]}
    except Exception as e:
        return {"logs": [f"Error reading logs: {str(e)}"]}


@router.get("/health/diagnostic")
async def get_diagnostic():
    """
    Perform deep diagnostic of all services (Database, Embedding, SkyAI) concurrently.
    Returns a list of status checks.
    """
    service = DiagnosticService(embedding_service=deps.embedding_service, vector_store=deps.vector_store)
    return await service.get_all_diagnostics()
