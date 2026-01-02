"""
Query Cost Attribution Router
Calcule le coût financier des requêtes basé sur les tarifs cloud (AWS/Azure)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import re

router = APIRouter(prefix="/cost", tags=["cost"])

# Tarifs Cloud (moyennes 2024)
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
        "io_per_million": 0.15,  # Estimation (pas de tarif public détaillé)
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
    
    # Coûts unitaires
    io_cost_per_execution: float
    cpu_cost_per_execution: float
    total_cost_per_execution: float
    
    # Projections
    daily_cost: float
    monthly_cost: float
    annual_cost: float
    
    # Métriques
    estimated_io_requests: int
    execution_frequency: int
    
    # Breakdown
    cost_breakdown: Dict[str, Any]

def estimate_io_requests(sql: str, rows_examined: Optional[int] = None) -> int:
    """
    Estime le nombre de requêtes I/O basé sur la requête SQL
    """
    if rows_examined:
        # Approximation: 1 I/O request per 100 rows examined
        return max(rows_examined // 100, 1)
    
    # Estimation basée sur le type de requête
    sql_lower = sql.lower()
    
    # Scan complet de table
    if "select *" in sql_lower and "where" not in sql_lower:
        return 10000  # Estimation haute pour full table scan
    
    # Requête avec WHERE mais sans index (estimation)
    if "where" in sql_lower:
        return 1000
    
    # Requête simple
    return 100

def estimate_cpu_time(query_time: Optional[float] = None) -> float:
    """
    Estime le temps CPU en secondes
    """
    if query_time:
        return query_time
    
    # Estimation par défaut: 0.1 seconde
    return 0.1

@router.post("/estimate", response_model=CostEstimateResponse)
async def estimate_query_cost(request: CostEstimateRequest):
    """
    Calcule le coût estimé d'une requête SQL
    """
    try:
        # Validation du provider
        if request.cloud_provider not in CLOUD_PRICING:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown cloud provider. Available: {list(CLOUD_PRICING.keys())}"
            )
        
        pricing = CLOUD_PRICING[request.cloud_provider]
        
        # Estimation des I/O requests
        io_requests = estimate_io_requests(request.sql, request.rows_examined)
        
        # Calcul du coût I/O
        io_cost = (io_requests / 1_000_000) * pricing["io_per_million"]
        
        # Estimation du temps CPU
        cpu_seconds = estimate_cpu_time(request.query_time)
        
        # Calcul du coût CPU (converti en heures)
        cpu_cost = (cpu_seconds / 3600) * pricing["cpu_per_hour"]
        
        # Coût total par exécution
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
    """
    Compare les coûts entre une requête originale et optimisée
    """
    try:
        # Estimation coût original
        original_request = CostEstimateRequest(
            sql=original_sql,
            rows_examined=original_metrics.get("rows_examined") if original_metrics else None,
            query_time=original_metrics.get("query_time") if original_metrics else None,
            cloud_provider=cloud_provider,
            execution_frequency_per_day=execution_frequency_per_day
        )
        original_cost = await estimate_query_cost(original_request)
        
        # Estimation coût optimisé
        optimized_request = CostEstimateRequest(
            sql=optimized_sql,
            rows_examined=optimized_metrics.get("rows_examined") if optimized_metrics else None,
            query_time=optimized_metrics.get("query_time") if optimized_metrics else None,
            cloud_provider=cloud_provider,
            execution_frequency_per_day=execution_frequency_per_day
        )
        optimized_cost = await estimate_query_cost(optimized_request)
        
        # Calcul des économies
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
    """
    Retourne les tarifs cloud disponibles
    """
    return {
        "providers": CLOUD_PRICING,
        "note": "Pricing based on 2024 public cloud rates. Actual costs may vary.",
        "last_updated": "2024-01-02"
    }
