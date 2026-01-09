from fastapi import APIRouter, HTTPException
import time
from database import get_db_connection
from models import SandboxRequest, SandboxResponse, SandboxResult
from error_factory import ErrorFactory

router = APIRouter()


def detect_query_type(sql: str) -> str:
    """Detect the type of SQL query"""
    sql_upper = sql.strip().upper()
    if sql_upper.startswith("SELECT"):
        return "SELECT"
    elif sql_upper.startswith("UPDATE"):
        return "UPDATE"
    elif sql_upper.startswith("DELETE"):
        return "DELETE"
    elif sql_upper.startswith("INSERT"):
        return "INSERT"
    else:
        return "UNKNOWN"


def is_dangerous_query(sql: str) -> tuple[bool, str]:
    """Check if query is too dangerous even for sandbox"""
    sql_upper = sql.strip().upper()
    
    dangerous_keywords = [
        "DROP TABLE", "DROP DATABASE", "TRUNCATE", 
        "ALTER USER", "CREATE USER", "DROP USER",
        "GRANT", "REVOKE"
    ]
    
    for keyword in dangerous_keywords:
        if keyword in sql_upper:
            return True, f"Query contains dangerous operation: {keyword}"
    
    return False, ""


@router.post("/sandbox/test", response_model=SandboxResponse)
async def test_query_in_sandbox(request: SandboxRequest):
    """
    🔒 Smart Sandboxing - Test queries safely without persisting changes
    
    This endpoint executes a query inside a transaction and automatically
    rolls it back, allowing you to see what WOULD happen without actually
    modifying the database.
    
    Perfect for:
    - Testing UPDATE/DELETE queries before running them for real
    - Previewing SELECT results
    - Validating query syntax
    - Checking rows affected count
    
    Security:
    - All changes are rolled back (ROLLBACK)
    - Timeout protection (default 5s)
    - Dangerous operations blocked (DROP, TRUNCATE, etc.)
    - Isolated transaction (REPEATABLE READ)
    """
    
    # Security check
    is_dangerous, danger_reason = is_dangerous_query(request.sql)
    if is_dangerous:
        return SandboxResponse(
            success=False,
            mode="sandbox",
            message="Query blocked for safety",
            error=danger_reason,
            warning="This operation is not allowed even in sandbox mode",
            sql=request.sql
        )
    
    query_type = detect_query_type(request.sql)
    
    conn = None
    cursor = None
    
    try:
        # Get database connection
        conn = get_db_connection(database=request.database)
        cursor = conn.cursor(dictionary=True)
        
        start_time = time.time()
        
        # Start transaction with REPEATABLE READ isolation
        cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        cursor.execute("START TRANSACTION")
        
        # Execute the query with timeout
        cursor.execute(f"SET SESSION max_statement_time = {request.timeout_seconds}")
        cursor.execute(request.sql)
        
        # Get results
        rows_affected = cursor.rowcount
        
        # For SELECT queries, fetch results
        if query_type == "SELECT":
            results = cursor.fetchall()
            columns = list(results[0].keys()) if results else []
            rows = [list(row.values()) for row in results]
        else:
            # For UPDATE/DELETE/INSERT, show affected rows
            results = []
            columns = ["rows_affected"]
            rows = [[rows_affected]]
        
        execution_time_ms = (time.time() - start_time) * 1000
        
        # CRITICAL: Always rollback to prevent any changes
        cursor.execute("ROLLBACK")
        
        # Build success message
        if query_type == "SELECT":
            message = f"Query tested safely - {len(rows)} rows returned"
        else:
            message = f"Query tested safely - would affect {rows_affected} rows (NOT persisted)"
        
        return SandboxResponse(
            success=True,
            mode="sandbox",
            message=message,
            result=SandboxResult(
                columns=columns,
                rows=rows,
                rows_affected=rows_affected,
                execution_time_ms=round(execution_time_ms, 2)
            ),
            query_type=query_type,
            warning="⚠️ Changes were NOT persisted - this was a safe test" if query_type != "SELECT" else None,
            sql=request.sql
        )
        
    except Exception as e:
        # Ensure rollback even on error
        if cursor:
            try:
                cursor.execute("ROLLBACK")
            except:
                pass
        
        db_error = ErrorFactory.database_error(
            "Sandbox Query Execution",
            "Query failed during safe sandbox test",
            original_error=e,
            sql=request.sql[:100]
        )
        
        error_msg = str(db_error)
        
        # Smart Diagnostic: If table doesn't exist, check for shop_ prefix
        simple_e = str(e)
        if "Table" in simple_e and "doesn't exist" in simple_e:
            if "order_items" in simple_e and "shop_order_items" not in simple_e:
                error_msg += " (Smart Suggestion: Did you mean 'shop_order_items'? This environment uses prefixed tables.)"
            elif "orders" in simple_e and "shop_orders" not in simple_e:
                error_msg += " (Smart Suggestion: Did you mean 'shop_orders'?)"
            # ... (rest of diagnostics preserved in replaced content)
            elif "customers" in simple_e and "shop_customers" not in simple_e:
                error_msg += " (Smart Suggestion: Did you mean 'shop_customers'?)"
            elif "products" in simple_e and "shop_products" not in simple_e:
                error_msg += " (Smart Suggestion: Did you mean 'shop_products'?)"
        
        return SandboxResponse(
            success=False,
            mode="sandbox",
            message="Query failed in sandbox",
            error=error_msg,
            query_type=query_type,
            sql=request.sql
        )
        
    finally:
        # Cleanup
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.post("/sandbox/compare")
async def compare_queries(original_sql: str, optimized_sql: str, database: str = "shop_demo"):
    """
    🔬 Compare two queries side-by-side in sandbox
    
    Useful for comparing original vs optimized queries to see the difference
    in execution time and rows examined.
    """
    
    # Test original query
    original_result = await test_query_in_sandbox(
        SandboxRequest(sql=original_sql, database=database)
    )
    
    # Test optimized query
    optimized_result = await test_query_in_sandbox(
        SandboxRequest(sql=optimized_sql, database=database)
    )
    
    # Calculate improvement
    improvement_percent = 0
    if (original_result.success and optimized_result.success and 
        original_result.result and optimized_result.result):
        original_time = original_result.result.execution_time_ms
        optimized_time = optimized_result.result.execution_time_ms
        if original_time > 0:
            improvement_percent = ((original_time - optimized_time) / original_time) * 100
    
    return {
        "original": original_result,
        "optimized": optimized_result,
        "improvement_percent": round(improvement_percent, 2),
        "recommendation": "Use optimized query" if improvement_percent > 10 else "Marginal improvement"
    }
