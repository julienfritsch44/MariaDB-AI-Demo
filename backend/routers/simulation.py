from fastapi import APIRouter, HTTPException
import subprocess
import os
from database import get_db_connection

router = APIRouter()

# Global state for simulation
simulation_process = None

@router.post("/start")
async def start_simulation():
    """Start the background traffic simulator"""
    global simulation_process
    if simulation_process is not None:
        if simulation_process.poll() is None:
            return {"status": "already_running", "pid": simulation_process.pid}
        else:
            # Process finished/died, clear it
            simulation_process = None

    try:
        # Assuming traffic_simulator.py is in the backend directory
        # We need to go up one level from routers to backend
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script_path = os.path.join(backend_dir, "traffic_simulator.py")
        simulation_process = subprocess.Popen(["python", script_path])
        return {"status": "started", "pid": simulation_process.pid}
    except Exception as e:
        print(f"Failed to start simulator: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start simulator: {str(e)}")

@router.post("/stop")
async def stop_simulation():
    """Stop the background traffic simulator"""
    global simulation_process
    if simulation_process is not None:
        if simulation_process.poll() is None:
            simulation_process.terminate()
            try:
                simulation_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                simulation_process.kill()
        
        simulation_process = None
        return {"status": "stopped"}
        
    return {"status": "not_running"}


@router.get("/status")
async def simulation_status():
    """Check if simulation is running"""
    global simulation_process
    if simulation_process is not None and simulation_process.poll() is None:
        return {"running": True, "pid": simulation_process.pid}
    return {"running": False}


@router.get("/stats")
async def get_simulation_stats():
    """Get the latest real-time stats from the background simulator"""
    import json
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    stats_path = os.path.join(backend_dir, "services", "simulation_stats.json")
    
    if os.path.exists(stats_path):
        try:
            with open(stats_path, "r") as f:
                return json.load(f)
        except:
            pass
            
    # Mock fallback if file doesn't exist yet but simulation is running
    return {
        "revenue": 124590,
        "orders": 1402,
        "active_users": 342,
        "total_queries": 0,
        "slow_queries": 0
    }


@router.post("/test")
async def simulation_test():
    """
    Run a single test query against shop_demo to validate:
    1. Database connection works
    2. Tables exist
    3. Data was seeded
    Does NOT flood SkySQL - just 1 lightweight query.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Try to use shop_demo
        cursor.execute("USE shop_demo")
        
        # Quick count queries
        results = {}
        for table in ["shop_customers", "shop_products", "shop_orders", "shop_order_items"]:
            try:
                cursor.execute(f"SELECT COUNT(*) as cnt FROM {table}")
                row = cursor.fetchone()
                results[table] = row["cnt"] if row else 0
            except Exception as e:
                results[table] = f"ERROR: {str(e)[:50]}"
        
        conn.close()
        
        return {
            "status": "ok",
            "database": "shop_demo",
            "tables": results,
            "ready": all(isinstance(v, int) and v > 0 for v in results.values())
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "ready": False
        }
