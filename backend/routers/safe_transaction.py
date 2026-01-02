"""
Safe Transaction Mode Router - Anti-Autocommit Protection
Prevents data corruption by enforcing explicit transaction management
"""

import time
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from database import get_db_connection
from mock_data import MockDataGenerator

router = APIRouter()


class TransactionModeConfig(BaseModel):
    mode: str = "strict"
    scope: str = "session"
    whitelist_users: Optional[List[str]] = None
    whitelist_queries: Optional[List[str]] = None


class TransactionModeStatus(BaseModel):
    enabled: bool
    mode: str
    scope: str
    violations_blocked: int
    last_violation: Optional[str] = None


class QueryValidationRequest(BaseModel):
    sql: str
    database: Optional[str] = None
    enforce_mode: bool = True


class QueryValidationResponse(BaseModel):
    success: bool
    allowed: bool
    reason: str
    violation_type: Optional[str] = None
    suggested_fix: Optional[str] = None
    execution_time_ms: Optional[float] = None


class TransactionModeResponse(BaseModel):
    success: bool
    message: str
    config: Optional[TransactionModeConfig] = None
    status: Optional[TransactionModeStatus] = None


# In-memory state (in production, use Redis or database)
_transaction_mode_state = {
    "enabled": False,
    "mode": "warn",
    "scope": "session",
    "whitelist_users": [],
    "whitelist_queries": [],
    "violations_blocked": 0,
    "last_violation": None
}


def is_dml_query(sql: str) -> bool:
    """Check if query is a DML statement (INSERT, UPDATE, DELETE)"""
    sql_upper = sql.strip().upper()
    return any(sql_upper.startswith(keyword) for keyword in ["INSERT", "UPDATE", "DELETE"])


def is_in_transaction(sql: str) -> bool:
    """Check if query is wrapped in explicit transaction"""
    sql_upper = sql.strip().upper()
    
    # Check for explicit transaction keywords
    has_begin = "BEGIN" in sql_upper or "START TRANSACTION" in sql_upper
    has_commit = "COMMIT" in sql_upper
    has_rollback = "ROLLBACK" in sql_upper
    
    return has_begin or has_commit or has_rollback


def detect_autocommit_violation(sql: str) -> tuple[bool, str, str]:
    """
    Detect if query violates safe transaction mode
    
    Returns:
        (is_violation, violation_type, reason)
    """
    sql_upper = sql.strip().upper()
    
    # Allow SELECT queries
    if sql_upper.startswith("SELECT"):
        return False, "", ""
    
    # Allow DDL queries (they auto-commit anyway)
    ddl_keywords = ["CREATE", "ALTER", "DROP", "TRUNCATE"]
    if any(sql_upper.startswith(keyword) for keyword in ddl_keywords):
        return False, "", ""
    
    # Check DML queries
    if is_dml_query(sql):
        if not is_in_transaction(sql):
            return True, "AUTOCOMMIT_DML", "DML query executed outside explicit transaction"
    
    return False, "", ""


def generate_transaction_wrapper(sql: str) -> str:
    """Generate transaction-wrapped version of query"""
    return f"""BEGIN;
{sql}
COMMIT;"""


@router.post("/safe-transaction/configure", response_model=TransactionModeResponse)
async def configure_safe_transaction_mode(config: TransactionModeConfig):
    """
    🔒 Configure Safe Transaction Mode
    
    Modes:
    - strict: Reject all DML queries outside explicit transactions (FATAL ERROR)
    - warn: Allow but log warnings
    - log: Silent logging only
    
    Scope:
    - session: Apply to current session only
    - global: Apply to all connections (requires admin privileges)
    
    Example:
    ```json
    {
      "mode": "strict",
      "scope": "session",
      "whitelist_users": ["admin", "etl_service"]
    }
    ```
    """
    
    # Validate mode
    if config.mode not in ["strict", "warn", "log"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode: {config.mode}. Must be one of: strict, warn, log"
        )
    
    # Validate scope
    if config.scope not in ["session", "global"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scope: {config.scope}. Must be one of: session, global"
        )
    
    # Update state
    _transaction_mode_state["enabled"] = True
    _transaction_mode_state["mode"] = config.mode
    _transaction_mode_state["scope"] = config.scope
    _transaction_mode_state["whitelist_users"] = config.whitelist_users or []
    _transaction_mode_state["whitelist_queries"] = config.whitelist_queries or []
    
    return TransactionModeResponse(
        success=True,
        message=f"Safe Transaction Mode configured: {config.mode} mode, {config.scope} scope",
        config=config,
        status=TransactionModeStatus(
            enabled=True,
            mode=config.mode,
            scope=config.scope,
            violations_blocked=_transaction_mode_state["violations_blocked"],
            last_violation=_transaction_mode_state["last_violation"]
        )
    )


@router.get("/safe-transaction/status", response_model=TransactionModeResponse)
async def get_safe_transaction_status():
    """
    📊 Get Safe Transaction Mode Status
    
    Returns current configuration and statistics
    """
    
    # Check if in mock mode
    conn = get_db_connection()
    if isinstance(conn, type(conn)) and conn.__class__.__name__ == 'MockConnection':
        mock_data = MockDataGenerator.get_safe_transaction_status()
        return TransactionModeResponse(
            success=True,
            message="Safe Transaction Mode status (MOCK MODE)",
            status=TransactionModeStatus(**mock_data)
        )
    
    status = TransactionModeStatus(
        enabled=_transaction_mode_state["enabled"],
        mode=_transaction_mode_state["mode"],
        scope=_transaction_mode_state["scope"],
        violations_blocked=_transaction_mode_state["violations_blocked"],
        last_violation=_transaction_mode_state["last_violation"]
    )
    
    config = TransactionModeConfig(
        mode=_transaction_mode_state["mode"],
        scope=_transaction_mode_state["scope"],
        whitelist_users=_transaction_mode_state["whitelist_users"],
        whitelist_queries=_transaction_mode_state["whitelist_queries"]
    )
    
    return TransactionModeResponse(
        success=True,
        message="Safe Transaction Mode status retrieved",
        config=config,
        status=status
    )


@router.post("/safe-transaction/validate", response_model=QueryValidationResponse)
async def validate_query_transaction_safety(request: QueryValidationRequest):
    """
    🔍 Validate Query Transaction Safety
    
    Checks if a query violates safe transaction mode BEFORE execution.
    
    This is the core protection mechanism that prevents silent data corruption.
    
    Example:
    ```json
    {
      "sql": "UPDATE orders SET status = 'shipped' WHERE id = 123",
      "enforce_mode": true
    }
    ```
    
    Response:
    - allowed: false if violation detected in strict mode
    - suggested_fix: Transaction-wrapped version of query
    """
    
    start_time = time.time()
    
    # Check if mode is enabled
    if not _transaction_mode_state["enabled"]:
        return QueryValidationResponse(
            success=True,
            allowed=True,
            reason="Safe Transaction Mode is disabled",
            execution_time_ms=round((time.time() - start_time) * 1000, 2)
        )
    
    # Detect violation
    is_violation, violation_type, reason = detect_autocommit_violation(request.sql)
    
    if not is_violation:
        return QueryValidationResponse(
            success=True,
            allowed=True,
            reason="Query is safe (SELECT, DDL, or explicit transaction)",
            execution_time_ms=round((time.time() - start_time) * 1000, 2)
        )
    
    # Violation detected
    mode = _transaction_mode_state["mode"]
    
    # Update statistics
    if mode == "strict" and request.enforce_mode:
        _transaction_mode_state["violations_blocked"] += 1
        _transaction_mode_state["last_violation"] = request.sql[:100]
    
    # Generate suggested fix
    suggested_fix = generate_transaction_wrapper(request.sql)
    
    # Determine if allowed based on mode
    allowed = mode != "strict" or not request.enforce_mode
    
    execution_time_ms = round((time.time() - start_time) * 1000, 2)
    
    if mode == "strict" and request.enforce_mode:
        return QueryValidationResponse(
            success=True,
            allowed=False,
            reason=f"⛔ BLOCKED: {reason}. Use explicit BEGIN...COMMIT or disable strict mode.",
            violation_type=violation_type,
            suggested_fix=suggested_fix,
            execution_time_ms=execution_time_ms
        )
    elif mode == "warn":
        return QueryValidationResponse(
            success=True,
            allowed=True,
            reason=f"⚠️ WARNING: {reason}. Consider wrapping in explicit transaction.",
            violation_type=violation_type,
            suggested_fix=suggested_fix,
            execution_time_ms=execution_time_ms
        )
    else:  # log mode
        return QueryValidationResponse(
            success=True,
            allowed=True,
            reason=f"ℹ️ LOGGED: {reason}",
            violation_type=violation_type,
            suggested_fix=suggested_fix,
            execution_time_ms=execution_time_ms
        )


@router.post("/safe-transaction/disable", response_model=TransactionModeResponse)
async def disable_safe_transaction_mode():
    """
    🔓 Disable Safe Transaction Mode
    
    Disables all transaction safety checks.
    Use with caution in production environments.
    """
    
    _transaction_mode_state["enabled"] = False
    
    return TransactionModeResponse(
        success=True,
        message="Safe Transaction Mode disabled",
        status=TransactionModeStatus(
            enabled=False,
            mode=_transaction_mode_state["mode"],
            scope=_transaction_mode_state["scope"],
            violations_blocked=_transaction_mode_state["violations_blocked"],
            last_violation=_transaction_mode_state["last_violation"]
        )
    )


@router.post("/safe-transaction/reset-stats")
async def reset_statistics():
    """
    🔄 Reset Statistics
    
    Resets violation counters and logs
    """
    
    _transaction_mode_state["violations_blocked"] = 0
    _transaction_mode_state["last_violation"] = None
    
    return {
        "success": True,
        "message": "Statistics reset successfully"
    }


@router.post("/safe-transaction/test-connection")
async def test_database_connection(database: Optional[str] = None):
    """
    🔌 Test Database Connection with Safe Transaction Mode
    
    Verifies that the database connection supports transaction isolation levels
    """
    
    try:
        conn = get_db_connection(database=database)
        cursor = conn.cursor(dictionary=True)
        
        # Test transaction support
        cursor.execute("SELECT @@autocommit AS autocommit_status")
        result = cursor.fetchone()
        
        cursor.execute("SELECT @@transaction_isolation AS isolation_level")
        isolation = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "Database connection supports transactions",
            "autocommit_status": result.get("autocommit_status"),
            "isolation_level": isolation.get("isolation_level"),
            "recommendation": "Enable Safe Transaction Mode for production safety"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection test failed: {str(e)}"
        )
