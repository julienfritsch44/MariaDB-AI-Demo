from fastapi import APIRouter
import os
import deps
from services.diagnostic import DiagnosticService
from error_factory import ErrorFactory

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
            configs_error = ErrorFactory.configuration_error(
                "Log Reader",
                f"Log file {log_file} not found in current or parent directory"
            )
            return {"logs": [f"Error: {configs_error}"]}
    
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            return {"logs": [l.rstrip() for l in all_lines[-lines:]]}
    except Exception as e:
        service_error = ErrorFactory.service_error(
            "Log Reader",
            "Failed to read log file",
            original_error=e
        )
        return {"logs": [f"Error: {service_error}"]}


@router.get("/health/diagnostic")
async def get_diagnostic():
    """
    Perform deep diagnostic of all services (Database, Embedding, SkyAI) concurrently.
    Returns a list of status checks.
    """
    service = DiagnosticService(embedding_service=deps.embedding_service, vector_store=deps.vector_store)
    return await service.get_all_diagnostics()
