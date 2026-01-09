from fastapi import APIRouter, HTTPException
from database import get_db_connection
from error_factory import ErrorFactory

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "MariaDB Local Pilot API", "status": "running"}


@router.get("/health")
async def health_check():
    """Check database connectivity"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        conn.close()
        return {"status": "healthy", "mariadb_version": version}
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Health Check",
            "Database connection failed during health verification",
            original_error=e
        )
        raise HTTPException(status_code=500, detail=str(db_error))
