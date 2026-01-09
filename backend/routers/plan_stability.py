"""
Detect plan flips and force optimal plans using hints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime
from database import get_db_connection
from error_factory import ErrorFactory

router = APIRouter(prefix="/plan/baseline", tags=["Plan Stability"])


class BaselineCreateRequest(BaseModel):
    sql: str
    fingerprint: Optional[str] = None
    force_update: bool = False


class BaselineCompareRequest(BaseModel):
    sql: str
    fingerprint: Optional[str] = None


class BaselineForceRequest(BaseModel):
    sql: str
    fingerprint: str
    hint_type: str = "USE_INDEX"


class PlanBaseline(BaseModel):
    fingerprint: str
    query_pattern: str
    best_plan: Dict[str, Any]
    best_execution_time_ms: int
    best_cost: float
    created_at: str
    last_validated: str


def generate_fingerprint(sql: str) -> str:
    """Generates a unique fingerprint for a query"""
    import hashlib
    normalized = sql.strip().lower()
    normalized = ' '.join(normalized.split())
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def parse_explain_json(explain_result: List[Dict]) -> Dict[str, Any]:
    """Parses EXPLAIN FORMAT=JSON results"""
    if not explain_result or not explain_result[0]:
        return {}
    
    explain_json = explain_result[0].get('EXPLAIN', '{}')
    if isinstance(explain_json, str):
        return json.loads(explain_json)
    return explain_json


def calculate_plan_distance(plan1: Dict, plan2: Dict) -> float:
    """
    Calculates the distance between two execution plans
    0.0 = identical, 1.0 = completely different
    """
    if not plan1 or not plan2:
        return 1.0
    
    distance = 0.0
    
    query_block1 = plan1.get('query_block', {})
    query_block2 = plan2.get('query_block', {})
    
    if query_block1.get('table', {}).get('access_type') != query_block2.get('table', {}).get('access_type'):
        distance += 0.5
    
    key1 = query_block1.get('table', {}).get('key')
    key2 = query_block2.get('table', {}).get('key')
    if key1 != key2:
        distance += 0.3
    
    using_filesort1 = 'filesort' in str(query_block1).lower()
    using_filesort2 = 'filesort' in str(query_block2).lower()
    if using_filesort1 != using_filesort2:
        distance += 0.2
    
    return min(distance, 1.0)


def extract_index_from_plan(plan: Dict) -> Optional[str]:
    """Extracts the index name used in the plan"""
    query_block = plan.get('query_block', {})
    table = query_block.get('table', {})
    return table.get('key')


def generate_hint(sql: str, index_name: str, hint_type: str = "USE_INDEX") -> str:
    """Generates a query with a hint to force a plan"""
    sql_upper = sql.upper()
    
    if 'FROM' not in sql_upper:
        return sql
    
    from_pos = sql_upper.find('FROM')
    after_from = sql[from_pos + 4:].strip()
    
    table_name = after_from.split()[0].strip()
    
    if hint_type == "USE_INDEX":
        hint = f"USE INDEX({index_name})"
    elif hint_type == "FORCE_INDEX":
        hint = f"FORCE INDEX({index_name})"
    else:
        hint = f"USE INDEX({index_name})"
    
    before_from = sql[:from_pos + 4]
    after_table = after_from[len(table_name):]
    
    return f"{before_from} {table_name} {hint} {after_table}"


@router.post("/create")
async def create_baseline(request: BaselineCreateRequest):
    """
    Create an execution plan baseline for a query
    """
    try:
        conn = get_db_connection()
        
        cursor = conn.cursor(dictionary=True)
        
        fingerprint = request.fingerprint or generate_fingerprint(request.sql)
        
        if not request.force_update:
            cursor.execute(
                "SELECT fingerprint FROM query_plan_baselines WHERE fingerprint = %s",
                (fingerprint,)
            )
            if cursor.fetchone():
                cursor.close()
                conn.close()
                return {
                    "success": False,
                    "message": "Baseline already exists. Use force_update=true to override.",
                    "fingerprint": fingerprint
                }
        
        cursor.execute(f"EXPLAIN FORMAT=JSON {request.sql}")
        explain_result = cursor.fetchall()
        plan = parse_explain_json(explain_result)
        
        start_time = datetime.now()
        cursor.execute(request.sql)
        cursor.fetchall()
        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        estimated_cost = plan.get('query_block', {}).get('cost_info', {}).get('query_cost', 0.0)
        
        cursor.execute("""
            INSERT INTO query_plan_baselines 
            (fingerprint, query_pattern, best_plan, best_execution_time_ms, best_cost, created_at, last_validated)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                best_plan = VALUES(best_plan),
                best_execution_time_ms = VALUES(best_execution_time_ms),
                best_cost = VALUES(best_cost),
                last_validated = NOW()
        """, (
            fingerprint,
            request.sql,
            json.dumps(plan),
            execution_time_ms,
            float(estimated_cost)
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "Baseline created successfully",
            "fingerprint": fingerprint,
            "baseline": {
                "execution_time_ms": execution_time_ms,
                "estimated_cost": estimated_cost,
                "plan_summary": {
                    "access_type": plan.get('query_block', {}).get('table', {}).get('access_type'),
                    "key": plan.get('query_block', {}).get('table', {}).get('key'),
                    "rows_examined": plan.get('query_block', {}).get('table', {}).get('rows_examined_per_scan')
                }
            }
        }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Plan Stability Baseline",
            "Failed to create query plan baseline",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }


@router.post("/compare")
async def compare_with_baseline(request: BaselineCompareRequest):
    """
    Compare current plan with baseline and detect plan flips
    """
    try:
        conn = get_db_connection()
        
        cursor = conn.cursor(dictionary=True)
        
        fingerprint = request.fingerprint or generate_fingerprint(request.sql)
        
        cursor.execute(
            "SELECT * FROM query_plan_baselines WHERE fingerprint = %s",
            (fingerprint,)
        )
        baseline = cursor.fetchone()
        
        if not baseline:
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": "No baseline found for this query. Create one first.",
                "fingerprint": fingerprint,
                "recommendation": "Call POST /plan/baseline/create to establish a baseline"
            }
        
        cursor.execute(f"EXPLAIN FORMAT=JSON {request.sql}")
        explain_result = cursor.fetchall()
        current_plan = parse_explain_json(explain_result)
        
        start_time = datetime.now()
        cursor.execute(request.sql)
        cursor.fetchall()
        current_execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        baseline_plan = json.loads(baseline['best_plan'])
        plan_distance = calculate_plan_distance(baseline_plan, current_plan)
        
        plan_flip_detected = plan_distance > 0.3
        
        performance_regression = (
            current_execution_time_ms > baseline['best_execution_time_ms'] * 1.5
        )
        
        cursor.close()
        conn.close()
        
        result = {
            "success": True,
            "fingerprint": fingerprint,
            "plan_flip_detected": plan_flip_detected,
            "performance_regression": performance_regression,
            "plan_distance": round(plan_distance, 2),
            "baseline": {
                "execution_time_ms": baseline['best_execution_time_ms'],
                "cost": float(baseline['best_cost']),
                "created_at": baseline['created_at'].isoformat() if baseline['created_at'] else None
            },
            "current": {
                "execution_time_ms": current_execution_time_ms,
                "cost": current_plan.get('query_block', {}).get('cost_info', {}).get('query_cost', 0.0)
            },
            "recommendations": []
        }
        
        if plan_flip_detected:
            result["recommendations"].append({
                "severity": "HIGH",
                "message": "Plan flip detected! Query execution plan has changed significantly.",
                "action": "Consider forcing the baseline plan using hints"
            })
        
        if performance_regression:
            degradation_pct = int(
                ((current_execution_time_ms - baseline['best_execution_time_ms']) 
                 / baseline['best_execution_time_ms']) * 100
            )
            result["recommendations"].append({
                "severity": "CRITICAL",
                "message": f"Performance regression: {degradation_pct}% slower than baseline",
                "action": "Force baseline plan immediately or investigate statistics"
            })
            
            baseline_index = extract_index_from_plan(baseline_plan)
            if baseline_index:
                result["suggested_hint"] = {
                    "index_name": baseline_index,
                    "hint_type": "USE_INDEX",
                    "rewritten_sql": generate_hint(request.sql, baseline_index, "USE_INDEX")
                }
        
        return result
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Plan Stability Comparison",
            f"Failed to compare query plan with baseline for fingerprint {fingerprint}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }


@router.get("/list")
async def list_baselines(limit: int = 50):
    """
    List all active baselines
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                fingerprint,
                LEFT(query_pattern, 100) as query_preview,
                best_execution_time_ms,
                best_cost,
                created_at,
                last_validated
            FROM query_plan_baselines
            ORDER BY last_validated DESC
            LIMIT %s
        """, (limit,))
        
        baselines = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "count": len(baselines),
            "baselines": [
                {
                    "fingerprint": b['fingerprint'],
                    "query_preview": b['query_preview'],
                    "best_execution_time_ms": b['best_execution_time_ms'],
                    "best_cost": float(b['best_cost']),
                    "created_at": b['created_at'].isoformat() if b['created_at'] else None,
                    "last_validated": b['last_validated'].isoformat() if b['last_validated'] else None
                }
                for b in baselines
            ]
        }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Plan Stability List",
            "Failed to list plan baselines",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }


@router.post("/force")
async def force_baseline_plan(request: BaselineForceRequest):
    """
    Force the use of a baseline plan using hints
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT best_plan FROM query_plan_baselines WHERE fingerprint = %s",
            (request.fingerprint,)
        )
        baseline = cursor.fetchone()
        
        if not baseline:
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": "Baseline not found"
            }
        
        baseline_plan = json.loads(baseline['best_plan'])
        index_name = extract_index_from_plan(baseline_plan)
        
        if not index_name:
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": "No index found in baseline plan. Cannot generate hint."
            }
        
        rewritten_sql = generate_hint(request.sql, index_name, request.hint_type)
        
        cursor.execute(f"EXPLAIN FORMAT=JSON {rewritten_sql}")
        explain_result = cursor.fetchall()
        new_plan = parse_explain_json(explain_result)
        
        start_time = datetime.now()
        cursor.execute(rewritten_sql)
        cursor.fetchall()
        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "Plan forced successfully",
            "rewritten_sql": rewritten_sql,
            "hint_applied": f"{request.hint_type}({index_name})",
            "execution_time_ms": execution_time_ms,
            "plan_summary": {
                "access_type": new_plan.get('query_block', {}).get('table', {}).get('access_type'),
                "key": new_plan.get('query_block', {}).get('table', {}).get('key')
            }
        }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Plan Stability Force",
            f"Failed to force plan for fingerprint {request.fingerprint}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }


@router.delete("/{fingerprint}")
async def delete_baseline(fingerprint: str):
    """
    Delete a baseline
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "DELETE FROM query_plan_baselines WHERE fingerprint = %s",
            (fingerprint,)
        )
        
        deleted = cursor.rowcount > 0
        
        conn.commit()
        cursor.close()
        conn.close()
        
        if deleted:
            return {
                "success": True,
                "message": "Baseline deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "Baseline not found"
            }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "Plan Stability Deletion",
            f"Failed to delete plan baseline {fingerprint}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }
