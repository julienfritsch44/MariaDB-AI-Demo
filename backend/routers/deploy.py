"""
Production Deployment Router
Handles the execution of optimized queries in the production environment.
"""

import time
import uuid
import logging
from fastapi import APIRouter
from database import get_db_connection
from models import DeploymentRequest, DeploymentResponse
from error_factory import ErrorFactory

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/deploy/production", response_model=DeploymentResponse)
async def deploy_to_production(request: DeploymentRequest):
    """
    🚀 Deploy Query to Production
    
    Executes the given SQL query against the production database.
    - If DB is available: Executes securely.
    - If in Demo Mode / Offline: Simulates success.
    """
    
    deployment_id = f"deploy_{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    
    conn = None
    cursor = None
    
    try:
        # 1. Attempt Real Database Connection
        conn = get_db_connection(database=request.database)
        
        # --- REAL MODE ---
        cursor = conn.cursor()
        
        # Execute Query
        cursor.execute(request.sql)
        
        # Commit changes (Production Deployment)
        conn.commit()
        
        rows_affected = cursor.rowcount
        execution_time_ms = (time.time() - start_time) * 1000
        
        return DeploymentResponse(
            success=True,
            message=f"🚀 Query successfully deployed. {rows_affected} rows affected.",
            rows_affected=rows_affected,
            execution_time_ms=round(execution_time_ms, 2),
            deployment_id=deployment_id
        )

    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Production Deployment",
            f"Failed to deploy query to database {request.database}",
            original_error=e
        )
        logger.error(db_error)
        return DeploymentResponse(
            success=False,
            message="Deployment failed",
            error=str(db_error),
            deployment_id=deployment_id
        )
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
