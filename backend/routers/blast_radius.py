"""
Blast Radius Analyzer Router - Business Impact Assessment
Predicts cascade impact of queries on microservices and users
"""

import time
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from database import get_db_connection
from error_factory import ErrorFactory, DatabaseError

router = APIRouter()


class ServiceDependency(BaseModel):
    service_name: str
    depends_on: List[str] = []
    criticality: str = "medium"
    estimated_users: int = 0


class ServiceTopology(BaseModel):
    services: List[ServiceDependency]


class BlastRadiusRequest(BaseModel):
    sql: str
    database: Optional[str] = None
    service_topology: Optional[ServiceTopology] = None
    include_lock_analysis: bool = True


class AffectedService(BaseModel):
    service_name: str
    impact_level: str
    cascade_depth: int
    estimated_users_affected: int
    blocking_reason: str
    mitigation: Optional[str] = None


class LockImpact(BaseModel):
    table_name: str
    lock_type: str
    estimated_duration_ms: float
    concurrent_queries_blocked: int
    risk_level: str


class BlastRadiusResponse(BaseModel):
    success: bool
    blast_radius_score: int
    business_impact: str
    affected_services: List[AffectedService]
    total_users_affected: int
    cascade_depth: int
    lock_impacts: List[LockImpact]
    execution_time_ms: float
    recommendations: List[str]
    mitigation_strategy: Optional[str] = None


def detect_affected_tables(sql: str) -> List[str]:
    """Extract table names from SQL query"""
    sql_upper = sql.upper()
    tables = []
    
    # Simple table extraction (can be improved with proper SQL parser)
    keywords = ["FROM", "JOIN", "UPDATE", "INTO", "TABLE"]
    
    for keyword in keywords:
        if keyword in sql_upper:
            parts = sql_upper.split(keyword)
            if len(parts) > 1:
                # Get next word after keyword
                next_part = parts[1].strip().split()[0] if parts[1].strip() else ""
                if next_part and next_part not in ["SELECT", "WHERE", "SET", "VALUES"]:
                    table_name = next_part.replace("(", "").replace(")", "").replace(";", "")
                    if table_name and table_name not in tables:
                        tables.append(table_name.lower())
    
    return tables


def estimate_lock_duration(sql: str, table_size_estimate: int = 1000000) -> float:
    """Estimate lock duration based on query type and table size"""
    sql_upper = sql.strip().upper()
    
    # Base estimates (ms)
    if sql_upper.startswith("SELECT"):
        if "FOR UPDATE" in sql_upper:
            return 50.0  # Row lock
        return 5.0  # No lock
    elif sql_upper.startswith("UPDATE"):
        if "WHERE" in sql_upper:
            return 100.0  # Row-level lock
        return table_size_estimate * 0.001  # Full table scan
    elif sql_upper.startswith("DELETE"):
        if "WHERE" in sql_upper:
            return 80.0
        return table_size_estimate * 0.002
    elif sql_upper.startswith("INSERT"):
        return 20.0
    elif "ALTER TABLE" in sql_upper:
        return table_size_estimate * 0.1  # DDL locks entire table
    elif "LOCK TABLES" in sql_upper:
        return 5000.0  # Explicit lock
    
    return 50.0


def calculate_cascade_impact(
    affected_tables: List[str],
    service_topology: Optional[ServiceTopology]
) -> tuple[List[AffectedService], int, int]:
    """
    Calculate cascade impact through service dependencies
    
    Returns:
        (affected_services, total_users, max_cascade_depth)
    """
    
    if not service_topology:
        # Default topology if not provided
        return [], 0, 0
    
    affected_services = []
    total_users = 0
    max_depth = 0
    
    # Build dependency graph
    service_map = {svc.service_name: svc for svc in service_topology.services}
    
    # Find directly affected services (those using affected tables)
    directly_affected = []
    for table in affected_tables:
        for service in service_topology.services:
            # Simple heuristic: service name contains table name or vice versa
            if table in service.service_name.lower() or service.service_name.lower() in table:
                directly_affected.append(service)
    
    # BFS to find cascade
    visited = set()
    queue = [(svc, 0) for svc in directly_affected]
    
    while queue:
        service, depth = queue.pop(0)
        
        if service.service_name in visited:
            continue
        
        visited.add(service.service_name)
        max_depth = max(max_depth, depth)
        total_users += service.estimated_users
        
        # Determine impact level
        if depth == 0:
            impact_level = "CRITICAL"
            blocking_reason = "Direct database access to locked table"
        elif depth == 1:
            impact_level = "HIGH"
            blocking_reason = "Depends on blocked service"
        else:
            impact_level = "MEDIUM"
            blocking_reason = f"Cascade dependency (depth {depth})"
        
        affected_services.append(AffectedService(
            service_name=service.service_name,
            impact_level=impact_level,
            cascade_depth=depth,
            estimated_users_affected=service.estimated_users,
            blocking_reason=blocking_reason,
            mitigation=f"Implement circuit breaker or fallback for {service.service_name}"
        ))
        
        # Find services that depend on this one
        for other_service in service_topology.services:
            if service.service_name in other_service.depends_on:
                if other_service.service_name not in visited:
                    queue.append((other_service, depth + 1))
    
    return affected_services, total_users, max_depth


def analyze_lock_impact(sql: str, affected_tables: List[str]) -> List[LockImpact]:
    """Analyze potential lock impact on concurrent queries"""
    
    lock_impacts = []
    sql_upper = sql.strip().upper()
    
    for table in affected_tables:
        # Determine lock type
        if "ALTER TABLE" in sql_upper or "LOCK TABLES" in sql_upper:
            lock_type = "TABLE_LOCK"
            risk_level = "CRITICAL"
            concurrent_blocked = 100
        elif sql_upper.startswith("UPDATE") or sql_upper.startswith("DELETE"):
            if "WHERE" in sql_upper:
                lock_type = "ROW_LOCK"
                risk_level = "MEDIUM"
                concurrent_blocked = 10
            else:
                lock_type = "TABLE_SCAN_LOCK"
                risk_level = "HIGH"
                concurrent_blocked = 50
        elif "FOR UPDATE" in sql_upper:
            lock_type = "ROW_LOCK"
            risk_level = "MEDIUM"
            concurrent_blocked = 5
        else:
            lock_type = "NO_LOCK"
            risk_level = "LOW"
            concurrent_blocked = 0
        
        duration = estimate_lock_duration(sql)
        
        lock_impacts.append(LockImpact(
            table_name=table,
            lock_type=lock_type,
            estimated_duration_ms=duration,
            concurrent_queries_blocked=concurrent_blocked,
            risk_level=risk_level
        ))
    
    return lock_impacts


def generate_recommendations(
    blast_radius_score: int,
    affected_services: List[AffectedService],
    lock_impacts: List[LockImpact]
) -> List[str]:
    """Generate actionable recommendations"""
    
    recommendations = []
    
    if blast_radius_score > 80:
        recommendations.append("🔴 CRITICAL: Schedule this query during maintenance window")
        recommendations.append("Consider breaking into smaller batches with delays")
    elif blast_radius_score > 60:
        recommendations.append("⚠️ HIGH RISK: Execute during low-traffic hours")
        recommendations.append("Implement circuit breakers in dependent services")
    
    if len(affected_services) > 5:
        recommendations.append(f"📊 {len(affected_services)} services affected - notify all teams")
    
    for lock in lock_impacts:
        if lock.risk_level == "CRITICAL":
            recommendations.append(f"⚠️ Table {lock.table_name}: Use online DDL or pt-online-schema-change")
        elif lock.risk_level == "HIGH":
            recommendations.append(f"⚠️ Table {lock.table_name}: Add WHERE clause to reduce lock scope")
    
    if not recommendations:
        recommendations.append("✅ Low impact query - safe to execute")
    
    return recommendations


@router.post("/blast-radius/analyze", response_model=BlastRadiusResponse)
async def analyze_blast_radius(request: BlastRadiusRequest):
    """
    💥 Blast Radius Analyzer - Predict Business Impact
    
    Analyzes the cascade impact of a query on:
    - Microservices architecture
    - End users
    - Concurrent queries
    - Business operations
    
    This transforms technical risk into business decision-making.
    
    Example:
    ```json
    {
      "sql": "UPDATE orders SET status = 'shipped' WHERE id = 123",
      "service_topology": {
        "services": [
          {
            "service_name": "orders_service",
            "depends_on": [],
            "criticality": "high",
            "estimated_users": 10000
          },
          {
            "service_name": "notification_service",
            "depends_on": ["orders_service"],
            "criticality": "medium",
            "estimated_users": 5000
          }
        ]
      }
    }
    ```
    """
    
    start_time = time.time()
    
    # 1. Extract affected tables
    affected_tables = detect_affected_tables(request.sql)
    
    if not affected_tables:
        return BlastRadiusResponse(
            success=True,
            blast_radius_score=0,
            business_impact="NONE",
            affected_services=[],
            total_users_affected=0,
            cascade_depth=0,
            lock_impacts=[],
            execution_time_ms=round((time.time() - start_time) * 1000, 2),
            recommendations=["✅ No tables affected - query is safe"]
        )
    
    # 2. Calculate cascade impact
    affected_services, total_users, cascade_depth = calculate_cascade_impact(
        affected_tables,
        request.service_topology
    )
    
    # 3. Analyze lock impact
    lock_impacts = []
    if request.include_lock_analysis:
        lock_impacts = analyze_lock_impact(request.sql, affected_tables)
    
    # 4. Calculate blast radius score (0-100)
    blast_radius_score = 0
    
    # Factor 1: Number of affected services (0-30 points)
    blast_radius_score += min(len(affected_services) * 5, 30)
    
    # Factor 2: Cascade depth (0-20 points)
    blast_radius_score += min(cascade_depth * 10, 20)
    
    # Factor 3: Total users affected (0-30 points)
    if total_users > 0:
        blast_radius_score += min(int(total_users / 1000), 30)
    
    # Factor 4: Lock severity (0-20 points)
    for lock in lock_impacts:
        if lock.risk_level == "CRITICAL":
            blast_radius_score += 20
            break
        elif lock.risk_level == "HIGH":
            blast_radius_score += 10
    
    blast_radius_score = min(blast_radius_score, 100)
    
    # 5. Determine business impact
    if blast_radius_score >= 80:
        business_impact = "CRITICAL"
        mitigation = "Schedule during maintenance window, implement rollback plan, notify all stakeholders"
    elif blast_radius_score >= 60:
        business_impact = "HIGH"
        mitigation = "Execute during low-traffic hours, enable circuit breakers, monitor closely"
    elif blast_radius_score >= 40:
        business_impact = "MEDIUM"
        mitigation = "Monitor service health, prepare rollback if needed"
    elif blast_radius_score >= 20:
        business_impact = "LOW"
        mitigation = "Standard monitoring sufficient"
    else:
        business_impact = "MINIMAL"
        mitigation = None
    
    # 6. Generate recommendations
    recommendations = generate_recommendations(
        blast_radius_score,
        affected_services,
        lock_impacts
    )
    
    execution_time_ms = round((time.time() - start_time) * 1000, 2)
    
    return BlastRadiusResponse(
        success=True,
        blast_radius_score=blast_radius_score,
        business_impact=business_impact,
        affected_services=affected_services,
        total_users_affected=total_users,
        cascade_depth=cascade_depth,
        lock_impacts=lock_impacts,
        execution_time_ms=execution_time_ms,
        recommendations=recommendations,
        mitigation_strategy=mitigation
    )


@router.post("/blast-radius/simulate-topology")
async def simulate_service_topology(database: str):
    """
    🏗️ Simulate Service Topology
    
    Generates a sample service topology based on database schema.
    Useful for testing blast radius analysis.
    """
    
    try:
        conn = get_db_connection(database=database)
        cursor = conn.cursor(dictionary=True)
        
        # Get all tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Generate sample topology
        services = []
        table_names = [list(t.values())[0] for t in tables]
        
        for i, table in enumerate(table_names[:10]):  # Limit to 10 services
            service = ServiceDependency(
                service_name=f"{table}_service",
                depends_on=[table_names[i-1] + "_service"] if i > 0 else [],
                criticality="high" if i < 3 else "medium",
                estimated_users=10000 - (i * 1000)
            )
            services.append(service)
        
        return {
            "success": True,
            "message": f"Generated topology for {len(services)} services",
            "topology": ServiceTopology(services=services)
        }
        
    except Exception as e:
        # Use ErrorFactory for service errors
        service_error = ErrorFactory.service_error(
            "Service Topology Simulation",
            f"Failed to simulate topology for database {database}",
            original_error=e
        )
        raise HTTPException(
            status_code=500,
            detail=str(service_error)
        )


@router.get("/blast-radius/metrics")
async def get_blast_radius_metrics():
    """
    📊 Get Blast Radius Metrics
    
    Returns aggregated metrics for blast radius analysis
    """
    
    return {
        "success": True,
        "metrics": {
            "total_analyses": 0,
            "average_blast_radius_score": 0,
            "critical_queries_detected": 0,
            "average_services_affected": 0,
            "average_users_affected": 0
        },
        "message": "Metrics tracking not yet implemented (use Redis/database for production)"
    }
