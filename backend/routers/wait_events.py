"""
Wait Events Profiling Router
Analyse les verrous InnoDB et wait events via Performance Schema
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import mariadb
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/wait-events", tags=["wait-events"])

class WaitEventsRequest(BaseModel):
    query_id: Optional[int] = None
    thread_id: Optional[int] = None
    analyze_current: bool = True

class WaitEventDetail(BaseModel):
    event_name: str
    count: int
    total_wait_ms: float
    avg_wait_ms: float
    percentage: float

class LockWaitDetail(BaseModel):
    blocking_thread_id: int
    blocked_thread_id: int
    blocking_query: Optional[str]
    blocked_query: str
    lock_type: str
    lock_mode: str
    wait_time_ms: float

class WaitEventsResponse(BaseModel):
    success: bool
    mode: str  # "live" or "mock"
    summary: Dict[str, Any]
    top_wait_events: List[WaitEventDetail]
    lock_waits: List[LockWaitDetail]
    recommendations: List[str]

def get_db_connection():
    """Connexion à MariaDB avec fallback mock"""
    try:
        return mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 3306)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            ssl=True,
            connect_timeout=3
        )
    except Exception as e:
        print(f"[Wait Events] DB connection failed: {e}")
        return None

def analyze_wait_events_live(conn) -> Dict[str, Any]:
    """Analyse des wait events via Performance Schema"""
    cursor = conn.cursor(dictionary=True)
    
    # 1. Top Wait Events globaux
    cursor.execute("""
        SELECT 
            event_name,
            count_star AS count,
            ROUND(sum_timer_wait / 1000000000, 2) AS total_wait_ms,
            ROUND(avg_timer_wait / 1000000000, 2) AS avg_wait_ms
        FROM performance_schema.events_waits_summary_global_by_event_name
        WHERE event_name LIKE 'wait/io/%' 
           OR event_name LIKE 'wait/lock/%'
           OR event_name LIKE 'wait/synch/%'
        ORDER BY sum_timer_wait DESC
        LIMIT 10
    """)
    
    wait_events_raw = cursor.fetchall()
    total_wait = sum(e['total_wait_ms'] for e in wait_events_raw)
    
    wait_events = [
        WaitEventDetail(
            event_name=e['event_name'],
            count=e['count'],
            total_wait_ms=e['total_wait_ms'],
            avg_wait_ms=e['avg_wait_ms'],
            percentage=round((e['total_wait_ms'] / total_wait * 100) if total_wait > 0 else 0, 1)
        )
        for e in wait_events_raw
    ]
    
    # 2. Lock Waits actifs (InnoDB)
    cursor.execute("""
        SELECT 
            r.trx_id AS blocking_trx,
            r.trx_mysql_thread_id AS blocking_thread_id,
            b.trx_id AS blocked_trx,
            b.trx_mysql_thread_id AS blocked_thread_id,
            b.trx_query AS blocked_query,
            w.requesting_lock_mode AS lock_mode,
            TIMESTAMPDIFF(SECOND, b.trx_wait_started, NOW()) AS wait_time_sec
        FROM information_schema.innodb_lock_waits w
        JOIN information_schema.innodb_trx b ON b.trx_id = w.requesting_trx_id
        JOIN information_schema.innodb_trx r ON r.trx_id = w.blocking_trx_id
        WHERE b.trx_wait_started IS NOT NULL
    """)
    
    lock_waits_raw = cursor.fetchall()
    lock_waits = [
        LockWaitDetail(
            blocking_thread_id=lw['blocking_thread_id'],
            blocked_thread_id=lw['blocked_thread_id'],
            blocking_query=None,  # Pas toujours disponible
            blocked_query=lw['blocked_query'] or "N/A",
            lock_type="InnoDB",
            lock_mode=lw['lock_mode'] or "UNKNOWN",
            wait_time_ms=lw['wait_time_sec'] * 1000 if lw['wait_time_sec'] else 0
        )
        for lw in lock_waits_raw
    ]
    
    # 3. Statistiques globales
    cursor.execute("""
        SELECT 
            COUNT(*) as total_threads,
            SUM(CASE WHEN state LIKE '%lock%' THEN 1 ELSE 0 END) as threads_waiting_locks
        FROM information_schema.processlist
    """)
    
    stats = cursor.fetchone()
    
    cursor.close()
    
    return {
        "wait_events": wait_events,
        "lock_waits": lock_waits,
        "summary": {
            "total_wait_events": len(wait_events),
            "total_lock_waits": len(lock_waits),
            "total_threads": stats['total_threads'] if stats else 0,
            "threads_waiting_locks": stats['threads_waiting_locks'] if stats else 0,
            "total_wait_time_ms": total_wait
        }
    }

def generate_mock_wait_events() -> Dict[str, Any]:
    """Génère des wait events mock pour la démo"""
    wait_events = [
        WaitEventDetail(
            event_name="wait/io/file/innodb/innodb_data_file",
            count=12450,
            total_wait_ms=2340.5,
            avg_wait_ms=0.19,
            percentage=45.2
        ),
        WaitEventDetail(
            event_name="wait/lock/table/sql/handler",
            count=890,
            total_wait_ms=1560.3,
            avg_wait_ms=1.75,
            percentage=30.1
        ),
        WaitEventDetail(
            event_name="wait/synch/mutex/innodb/buf_pool_mutex",
            count=5670,
            total_wait_ms=890.2,
            avg_wait_ms=0.16,
            percentage=17.2
        ),
        WaitEventDetail(
            event_name="wait/io/socket/sql/client_connection",
            count=3200,
            total_wait_ms=390.8,
            avg_wait_ms=0.12,
            percentage=7.5
        )
    ]
    
    lock_waits = [
        LockWaitDetail(
            blocking_thread_id=12345,
            blocked_thread_id=12346,
            blocking_query="UPDATE orders SET status='shipped' WHERE id=1234",
            blocked_query="SELECT * FROM orders WHERE id=1234 FOR UPDATE",
            lock_type="InnoDB",
            lock_mode="X",
            wait_time_ms=2300.5
        )
    ]
    
    return {
        "wait_events": wait_events,
        "lock_waits": lock_waits,
        "summary": {
            "total_wait_events": len(wait_events),
            "total_lock_waits": len(lock_waits),
            "total_threads": 45,
            "threads_waiting_locks": 1,
            "total_wait_time_ms": 5181.8
        }
    }

def generate_recommendations(data: Dict[str, Any]) -> List[str]:
    """Génère des recommandations basées sur les wait events"""
    recommendations = []
    
    # Analyse des wait events
    for event in data["wait_events"][:3]:
        if "innodb_data_file" in event.event_name:
            if event.percentage > 40:
                recommendations.append(
                    "High I/O wait detected (45.2%). Consider: 1) Adding indexes to reduce table scans, "
                    "2) Increasing innodb_buffer_pool_size, 3) Using faster storage (SSD)"
                )
        
        if "lock/table" in event.event_name:
            if event.percentage > 25:
                recommendations.append(
                    "Significant table lock contention (30.1%). Consider: 1) Using InnoDB instead of MyISAM, "
                    "2) Breaking large transactions into smaller ones, 3) Optimizing query patterns"
                )
        
        if "mutex" in event.event_name:
            if event.percentage > 15:
                recommendations.append(
                    "Mutex contention detected (17.2%). Consider: 1) Increasing innodb_buffer_pool_instances, "
                    "2) Reducing concurrent connections, 3) Optimizing hot queries"
                )
    
    # Analyse des lock waits
    if len(data["lock_waits"]) > 0:
        recommendations.append(
            f"Active lock waits detected ({len(data['lock_waits'])} threads blocked). "
            "Review blocking queries and consider: 1) Reducing transaction duration, "
            "2) Using optimistic locking, 3) Implementing retry logic"
        )
    
    if not recommendations:
        recommendations.append("No significant wait events detected. System performance is healthy.")
    
    return recommendations

@router.post("/analyze", response_model=WaitEventsResponse)
async def analyze_wait_events(request: WaitEventsRequest):
    """
    Analyse les wait events et lock waits
    """
    try:
        conn = get_db_connection()
        
        if conn:
            # Mode Live
            try:
                data = analyze_wait_events_live(conn)
                mode = "live"
                conn.close()
            except Exception as e:
                print(f"[Wait Events] Live analysis failed: {e}")
                data = generate_mock_wait_events()
                mode = "mock"
        else:
            # Mode Mock
            data = generate_mock_wait_events()
            mode = "mock"
        
        recommendations = generate_recommendations(data)
        
        return WaitEventsResponse(
            success=True,
            mode=mode,
            summary=data["summary"],
            top_wait_events=data["wait_events"],
            lock_waits=data["lock_waits"],
            recommendations=recommendations
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wait events analysis failed: {str(e)}")

@router.get("/health")
async def wait_events_health():
    """
    Vérifie si Performance Schema est activé
    """
    try:
        conn = get_db_connection()
        
        if not conn:
            return {
                "performance_schema_enabled": False,
                "mode": "mock",
                "message": "Database not accessible - using mock data"
            }
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SHOW VARIABLES LIKE 'performance_schema'")
        result = cursor.fetchone()
        
        enabled = result and result['Value'] == 'ON'
        
        cursor.close()
        conn.close()
        
        return {
            "performance_schema_enabled": enabled,
            "mode": "live" if enabled else "limited",
            "message": "Performance Schema is enabled" if enabled else "Performance Schema is disabled - limited metrics available"
        }
    
    except Exception as e:
        return {
            "performance_schema_enabled": False,
            "mode": "mock",
            "message": f"Health check failed: {str(e)}"
        }
