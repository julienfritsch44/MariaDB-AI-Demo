Automatic assignment of queries to Resource Groups based on Risk Score
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import mariadb
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/resource-groups", tags=["resource-groups"])

class ResourceGroupAssignment(BaseModel):
    sql: str
    risk_score: int
    recommended_group: str
    cpu_limit: Optional[str] = None
    thread_priority: Optional[int] = None
    reason: str

class ResourceGroupRequest(BaseModel):
    sql: str
    risk_score: Optional[int] = None
    auto_assign: bool = True

class ResourceGroupResponse(BaseModel):
    success: bool
    mode: str  # "live" or "mock"
    assignment: ResourceGroupAssignment
    available_groups: List[Dict[str, Any]]
    recommendations: List[str]

# Resource Groups Configuration
RESOURCE_GROUPS_CONFIG = {
    "critical_transactions": {
        "description": "High-priority OLTP transactions",
        "vcpu": "0-7",  # All cores
        "thread_priority": 0,  # Highest priority
        "risk_threshold": (0, 30),  # Low risk
        "use_case": "Payment processing, user authentication"
    },
    "standard_queries": {
        "description": "Normal business queries",
        "vcpu": "0-5",
        "thread_priority": 5,
        "risk_threshold": (31, 60),  # Medium risk
        "use_case": "Dashboard queries, reports"
    },
    "analytics_queries": {
        "description": "Heavy analytical workloads",
        "vcpu": "0-3",  # Limited cores
        "thread_priority": 10,  # Lower priority
        "risk_threshold": (61, 100),  # High risk
        "use_case": "Data exports, complex aggregations"
    },
    "background_jobs": {
        "description": "Non-urgent background tasks",
        "vcpu": "0-1",  # Minimal cores
        "thread_priority": 15,  # Lowest priority
        "risk_threshold": (80, 100),  # Very high risk
        "use_case": "Batch processing, maintenance"
    }
}

def get_db_connection():
    """MariaDB connection with mock fallback"""
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
        print(f"[Resource Groups] DB connection failed: {e}")
        return None

def assign_resource_group(sql: str, risk_score: int) -> ResourceGroupAssignment:
    """
    Automatically assign a Resource Group based on risk score
    """
    # Determine the appropriate group
    for group_name, config in RESOURCE_GROUPS_CONFIG.items():
        min_risk, max_risk = config["risk_threshold"]
        if min_risk <= risk_score <= max_risk:
            return ResourceGroupAssignment(
                sql=sql[:100] + "..." if len(sql) > 100 else sql,
                risk_score=risk_score,
                recommended_group=group_name,
                cpu_limit=config["vcpu"],
                thread_priority=config["thread_priority"],
                reason=f"Risk score {risk_score} matches {group_name} profile. "
                       f"Use case: {config['use_case']}"
            )
    
    # Fallback: analytics_queries pour scores élevés
    return ResourceGroupAssignment(
        sql=sql[:100] + "..." if len(sql) > 100 else sql,
        risk_score=risk_score,
        recommended_group="analytics_queries",
        cpu_limit=RESOURCE_GROUPS_CONFIG["analytics_queries"]["vcpu"],
        thread_priority=RESOURCE_GROUPS_CONFIG["analytics_queries"]["thread_priority"],
        reason=f"Risk score {risk_score} requires resource limitation"
    )

def create_resource_groups_if_needed(conn) -> bool:
    """
    Create Resource Groups if they don't exist
    """
    try:
        cursor = conn.cursor()
        
        for group_name, config in RESOURCE_GROUPS_CONFIG.items():
            # Check if group exists
            cursor.execute(f"SELECT * FROM information_schema.resource_groups WHERE name = '{group_name}'")
            if cursor.fetchone() is None:
                # Create group
                create_sql = f"""
                CREATE RESOURCE GROUP {group_name}
                TYPE = USER
                VCPU = {config['vcpu']}
                THREAD_PRIORITY = {config['thread_priority']}
                ENABLE
                """
                cursor.execute(create_sql)
                print(f"[Resource Groups] Created: {group_name}")
        
        cursor.close()
        return True
    
    except Exception as e:
        print(f"[Resource Groups] Creation failed: {e}")
        return False

def apply_resource_group(conn, group_name: str) -> bool:
    """
    Apply a Resource Group to the current connection
    """
    try:
        cursor = conn.cursor()
        cursor.execute(f"SET RESOURCE GROUP {group_name}")
        cursor.close()
        return True
    except Exception as e:
        print(f"[Resource Groups] Assignment failed: {e}")
        return False

def generate_recommendations(assignment: ResourceGroupAssignment) -> List[str]:
    """
    Generate recommendations based on the assignment
    """
    recommendations = []
    
    if assignment.risk_score > 80:
        recommendations.append(
            "⚠️ Very high risk query detected. Consider: "
            "1) Running during off-peak hours, "
            "2) Breaking into smaller chunks, "
            "3) Adding appropriate indexes"
        )
    
    if assignment.recommended_group == "analytics_queries":
        recommendations.append(
            "📊 Query assigned to analytics group (limited resources). "
            "Expected behavior: Slower execution but won't impact critical transactions"
        )
    
    if assignment.recommended_group == "critical_transactions":
        recommendations.append(
            "⚡ Query assigned to critical group (full resources). "
            "Ensure this query truly requires high priority"
        )
    
    recommendations.append(
        f"💡 To manually set resource group: SET RESOURCE GROUP {assignment.recommended_group}"
    )
    
    return recommendations

@router.post("/assign", response_model=ResourceGroupResponse)
async def assign_resource_group_endpoint(request: ResourceGroupRequest):
    """
    Automatically assign a Resource Group based on risk score
    """
    try:
        # If no risk score provided, estimate based on query patterns
        risk_score = request.risk_score
        if risk_score is None:
            # Estimation simple basée sur des patterns
            sql_lower = request.sql.lower()
            if "select *" in sql_lower and "where" not in sql_lower:
                risk_score = 85  # Full table scan
            elif "join" in sql_lower and sql_lower.count("join") > 2:
                risk_score = 70  # Multiple joins
            elif any(kw in sql_lower for kw in ["insert", "update", "delete"]):
                risk_score = 40  # DML
            else:
                risk_score = 50  # Default
        
        # Assign the group
        assignment = assign_resource_group(request.sql, risk_score)
        
        # Attempt to connect to verify/create groups
        conn = get_db_connection()
        mode = "mock"
        
        if conn and request.auto_assign:
            try:
                # Create groups if needed
                create_resource_groups_if_needed(conn)
                
                # Apply group (for demo purposes)
                if apply_resource_group(conn, assignment.recommended_group):
                    mode = "live"
                
                conn.close()
            except Exception as e:
                print(f"[Resource Groups] Live mode failed: {e}")
                mode = "mock"
        
        # Prepare the list of available groups
        available_groups = [
            {
                "name": name,
                "description": config["description"],
                "vcpu": config["vcpu"],
                "thread_priority": config["thread_priority"],
                "risk_range": f"{config['risk_threshold'][0]}-{config['risk_threshold'][1]}"
            }
            for name, config in RESOURCE_GROUPS_CONFIG.items()
        ]
        
        recommendations = generate_recommendations(assignment)
        
        return ResourceGroupResponse(
            success=True,
            mode=mode,
            assignment=assignment,
            available_groups=available_groups,
            recommendations=recommendations
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resource group assignment failed: {str(e)}")

@router.get("/list")
async def list_resource_groups():
    """
    List all available Resource Groups
    """
    try:
        conn = get_db_connection()
        
        if conn:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("""
                    SELECT 
                        name,
                        type,
                        vcpu_ids,
                        thread_priority,
                        enabled
                    FROM information_schema.resource_groups
                """)
                
                groups = cursor.fetchall()
                cursor.close()
                conn.close()
                
                return {
                    "success": True,
                    "mode": "live",
                    "groups": groups,
                    "configured_groups": RESOURCE_GROUPS_CONFIG
                }
            except Exception as e:
                print(f"[Resource Groups] Query failed: {e}")
        
        # Fallback: return configuration
        return {
            "success": True,
            "mode": "mock",
            "groups": [],
            "configured_groups": RESOURCE_GROUPS_CONFIG,
            "message": "Database not accessible - showing configured groups"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list resource groups: {str(e)}")

@router.get("/health")
async def resource_groups_health():
    """
    Check if Resource Groups are supported
    """
    try:
        conn = get_db_connection()
        
        if not conn:
            return {
                "supported": False,
                "mode": "mock",
                "message": "Database not accessible"
            }
        
        cursor = conn.cursor()
        
        # Check MariaDB version (Resource Groups since 10.5)
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        
        # Check if resource_groups table exists
        cursor.execute("SHOW TABLES FROM information_schema LIKE 'resource_groups'")
        has_table = cursor.fetchone() is not None
        
        cursor.close()
        conn.close()
        
        return {
            "supported": has_table,
            "mode": "live" if has_table else "limited",
            "version": version,
            "message": "Resource Groups are supported" if has_table else "Resource Groups not available in this MariaDB version"
        }
    
    except Exception as e:
        return {
            "supported": False,
            "mode": "mock",
            "message": f"Health check failed: {str(e)}"
        }
