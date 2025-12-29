from fastapi import APIRouter
from typing import Optional
from database import get_db_connection
from schemas.simulation import IndexSimulationRequest, IndexSimulationResponse, ExplainPlan
import re

router = APIRouter()

async def _perform_index_simulation(sql: str, proposed_index: str, database: Optional[str] = "shop_demo") -> IndexSimulationResponse:
    """Helper function to perform index simulation logic"""
    
    # Parse the index definition to extract table and columns
    index_match = re.search(
        r'CREATE\s+INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)',
        proposed_index,
        re.IGNORECASE
    )
    
    if not index_match:
        # Fallback for simple simulations
        index_name = "idx_suggested"
        table_name = "unknown"
        index_columns = ["id"]
    else:
        index_name = index_match.group(1)
        table_name = index_match.group(2)
        index_columns = [col.strip() for col in index_match.group(3).split(',')]
    
    # Step 1: Get current EXPLAIN plan
    current_plan = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if database:
            cursor.execute(f"USE {database}")
        
        cursor.execute(f"EXPLAIN {sql}")
        explain_result = cursor.fetchone()
        conn.close()
        
        if explain_result:
            rows = explain_result.get('rows', 1000)
            access_type = explain_result.get('type', 'ALL')
            
            time_multipliers = {
                'ALL': 1.0, 'index': 0.8, 'range': 0.3, 'ref': 0.1, 'eq_ref': 0.05, 'const': 0.01, 'system': 0.001
            }
            multiplier = time_multipliers.get(access_type, 1.0)
            estimated_time = (rows * 0.05 * multiplier)
            
            current_plan = ExplainPlan(
                access_type=access_type,
                rows_examined=rows,
                key=explain_result.get('key'),
                key_len=explain_result.get('key_len'),
                extra=explain_result.get('Extra'),
                estimated_time_ms=round(estimated_time, 2)
            )
    except:
        current_plan = ExplainPlan(
            access_type="ALL", rows_examined=10000, key=None, extra="Using where", estimated_time_ms=500.0
        )
    
    # Step 2: Heuristic/AI estimation of improvement
    improvement = 85.0 if current_plan.access_type == "ALL" else 40.0
    with_index_access_type = "ref"
    with_index_rows = max(1, current_plan.rows_examined // 100)
    
    # Check if index columns appear in query for better estimation
    sql_upper = sql.upper()
    index_cols_in_query = sum(1 for col in index_columns if col.upper() in sql_upper)
    
    if index_cols_in_query > 0:
        improvement = min(95.0, improvement + (index_cols_in_query * 5))
        recommendation = "HIGHLY RECOMMENDED" if improvement > 80 else "RECOMMENDED"
    else:
        improvement = 10.0
        recommendation = "MARGINAL"

    with_index_plan = ExplainPlan(
        access_type=with_index_access_type,
        rows_examined=with_index_rows,
        key=index_name,
        key_len=str(len(index_columns) * 4),
        extra="Using index",
        estimated_time_ms=round(current_plan.estimated_time_ms * (100 - improvement) / 100, 2)
    )
    
    ai_analysis = f"Optimized access: '{with_index_access_type}' via {index_name}. Expected latency reduction: {improvement}%."
    
    return IndexSimulationResponse(
        current_plan=current_plan,
        with_index_plan=with_index_plan,
        improvement_percent=round(improvement, 1),
        recommendation=recommendation,
        create_index_sql=proposed_index,
        ai_analysis=ai_analysis
    )

@router.post("/simulate-index", response_model=IndexSimulationResponse)
async def simulate_index(request: IndexSimulationRequest):
    """🎯 Virtual Index Simulator wrapper"""
    return await _perform_index_simulation(request.sql, request.proposed_index, request.database)
