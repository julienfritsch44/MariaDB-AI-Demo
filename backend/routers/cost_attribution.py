"""
Query Cost Attribution Router
Calculates query financial cost based on cloud pricing (AWS/Azure)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import re

router = APIRouter(prefix="/cost", tags=["cost"])

# Cloud Pricing (2024 averages)
CLOUD_PRICING = {
    "aws_rds_mariadb": {
        "io_per_million": 0.20,  # $0.20 per million I/O requests
        "cpu_per_hour": 0.10,    # $0.10 per vCPU hour (approximation)
        "storage_gb_month": 0.115  # $0.115 per GB-month
    },
    "azure_database_mariadb": {
        "io_per_million": 0.18,
        "cpu_per_hour": 0.12,
        "storage_gb_month": 0.12
    },
    "mariadb_skysql": {
        "io_per_million": 0.15,  # Estimated (no detailed public pricing)
        "cpu_per_hour": 0.08,
        "storage_gb_month": 0.10
    }
}

class CostEstimateRequest(BaseModel):
    sql: str
    rows_examined: Optional[int] = None
    query_time: Optional[float] = None
    rows_sent: Optional[int] = None
    execution_frequency_per_day: Optional[int] = 1
    cloud_provider: str = "mariadb_skysql"

class CostEstimateResponse(BaseModel):
    sql: str
    cloud_provider: str
    
    # Unit costs
    io_cost_per_execution: float
    cpu_cost_per_execution: float
    total_cost_per_execution: float
    
    # Projections
    daily_cost: float
    monthly_cost: float
    annual_cost: float
    
    # Metrics
    estimated_io_requests: int
    execution_frequency: int
    
    # Breakdown
    cost_breakdown: Dict[str, Any]

def estimate_io_requests(sql: str, rows_examined: Optional[int] = None) -> int:
    """
    Estimates I/O requests based on the SQL query
    """
    # If we have actual metrics from sandbox, use those primarily
    if rows_examined is not None:
        # Approximation: 1 I/O request per 100 rows examined, min 1
        return max(rows_examined // 100, 1)
    
    # Heuristic estimation based on query patterns
    sql_lower = sql.lower()
    
    # Pattern: subquery IN (expensive, often full scans or correlated)
    if "in (select" in sql_lower:
        return 5000
        
    # Pattern: JOIN (optimized)
    if "join" in sql_lower:
        # If it's a join but with SELECT *, assume it's still medium-heavy
        if "select *" in sql_lower:
            return 800 # Reduced from 2000
        return 200 # Reduced from 500

    # Full table scan (SELECT * without WHERE)
    if "select *" in sql_lower and "where" not in sql_lower:
        return 5000 # Reduced from 10000
    
    # Query with WHERE but no explicit columns
    if "where" in sql_lower:
        if "select *" in sql_lower:
            return 400 # Reduced from 1000
        return 100 # Reduced from 300
    
    # Simple query
    return 50

def estimate_cpu_time(query_time: Optional[float] = None) -> float:
    """
    Estimates CPU time in seconds
    """
    if query_time:
        return query_time
    
    # Default estimation: 0.1 seconds
    return 0.1

@router.post("/estimate", response_model=CostEstimateResponse)
async def estimate_query_cost(request: CostEstimateRequest):
    """
    Calculates estimated SQL query cost
    """
    try:
        # Validation du provider
        if request.cloud_provider not in CLOUD_PRICING:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown cloud provider. Available: {list(CLOUD_PRICING.keys())}"
            )
        
        pricing = CLOUD_PRICING[request.cloud_provider]
        
        # I/O requests estimation
        io_requests = estimate_io_requests(request.sql, request.rows_examined)
        
        # I/O cost calculation
        io_cost = (io_requests / 1_000_000) * pricing["io_per_million"]
        
        # CPU time estimation
        cpu_seconds = estimate_cpu_time(request.query_time)
        
        # CPU cost calculation (converted to hours)
        cpu_cost = (cpu_seconds / 3600) * pricing["cpu_per_hour"]
        
        # Total cost per execution
        total_per_execution = io_cost + cpu_cost
        
        # Projections
        daily_cost = total_per_execution * request.execution_frequency_per_day
        monthly_cost = daily_cost * 30
        annual_cost = monthly_cost * 12
        
        return CostEstimateResponse(
            sql=request.sql[:100] + "..." if len(request.sql) > 100 else request.sql,
            cloud_provider=request.cloud_provider,
            io_cost_per_execution=round(io_cost, 6),
            cpu_cost_per_execution=round(cpu_cost, 6),
            total_cost_per_execution=round(total_per_execution, 6),
            daily_cost=round(daily_cost, 4),
            monthly_cost=round(monthly_cost, 2),
            annual_cost=round(annual_cost, 2),
            estimated_io_requests=io_requests,
            execution_frequency=request.execution_frequency_per_day,
            cost_breakdown={
                "io_percentage": round((io_cost / total_per_execution) * 100, 1) if total_per_execution > 0 else 0,
                "cpu_percentage": round((cpu_cost / total_per_execution) * 100, 1) if total_per_execution > 0 else 0,
                "pricing_model": {
                    "io_per_million": pricing["io_per_million"],
                    "cpu_per_hour": pricing["cpu_per_hour"]
                }
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cost estimation failed: {str(e)}")

@router.post("/compare")
async def compare_query_costs(
    original_sql: str,
    optimized_sql: str,
    original_metrics: Optional[Dict[str, Any]] = None,
    optimized_metrics: Optional[Dict[str, Any]] = None,
    cloud_provider: str = "mariadb_skysql",
    execution_frequency_per_day: int = 1
):
    """Compiles costs between original and optimized queries"""
    try:
        # Original cost estimation
        original_request = CostEstimateRequest(
            sql=original_sql,
            rows_examined=original_metrics.get("rows_examined") if original_metrics else None,
            query_time=original_metrics.get("query_time") if original_metrics else None,
            cloud_provider=cloud_provider,
            execution_frequency_per_day=execution_frequency_per_day
        )
        original_cost = await estimate_query_cost(original_request)
        
        # Optimized cost estimation
        optimized_request = CostEstimateRequest(
            sql=optimized_sql,
            rows_examined=optimized_metrics.get("rows_examined") if optimized_metrics else None,
            query_time=optimized_metrics.get("query_time") if optimized_metrics else None,
            cloud_provider=cloud_provider,
            execution_frequency_per_day=execution_frequency_per_day
        )
        optimized_cost = await estimate_query_cost(optimized_request)
        
        # Savings calculation
        monthly_savings = original_cost.monthly_cost - optimized_cost.monthly_cost
        annual_savings = original_cost.annual_cost - optimized_cost.annual_cost
        savings_percentage = ((original_cost.monthly_cost - optimized_cost.monthly_cost) / original_cost.monthly_cost * 100) if original_cost.monthly_cost > 0 else 0
        
        return {
            "original": original_cost.dict(),
            "optimized": optimized_cost.dict(),
            "savings": {
                "monthly_savings": round(monthly_savings, 2),
                "annual_savings": round(annual_savings, 2),
                "savings_percentage": round(savings_percentage, 1),
                "roi_message": f"Save ${round(monthly_savings, 2)}/month (${round(annual_savings, 2)}/year) - {round(savings_percentage, 1)}% reduction"
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cost comparison failed: {str(e)}")

@router.get("/pricing")
async def get_pricing_info():
    """Returns available cloud pricing information"""
    return {
        "providers": CLOUD_PRICING,
        "note": "Pricing based on 2024 public cloud rates. Actual costs may vary.",
        "last_updated": "2024-01-02"
    }
