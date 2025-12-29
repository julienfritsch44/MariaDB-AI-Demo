from fastapi import APIRouter, HTTPException
from database import get_db_connection

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "MariaDB FinOps Auditor API", "status": "running"}


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
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
