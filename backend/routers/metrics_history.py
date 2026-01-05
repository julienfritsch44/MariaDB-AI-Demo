from fastapi import APIRouter
from typing import List
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.get("/metrics/history")
async def get_metrics_history():
    """
    Return historical metrics for sparkline charts
    Returns last 24 data points (hourly) for each metric
    """
    # Generate realistic trending data
    now = datetime.now()
    hours = 24
    
    # Financial Impact - trending up (bad)
    base_cost = 14000
    financial_data = []
    for i in range(hours):
        trend = i * 10  # Gradual increase
        noise = random.uniform(-200, 200)
        financial_data.append(round(base_cost + trend + noise, 2))
    
    # Risk Score - fluctuating high
    risk_data = []
    for i in range(hours):
        base = 80
        wave = 10 * (i % 6) / 6  # Wave pattern
        noise = random.uniform(-5, 5)
        risk_data.append(round(min(100, max(0, base + wave + noise)), 1))
    
    # Neural Score - stable high (good)
    neural_data = []
    for i in range(hours):
        base = 98
        noise = random.uniform(-0.5, 0.5)
        neural_data.append(round(base + noise, 1))
    
    # RAG Memory - gradual growth
    rag_data = []
    base_rag = 1200
    for i in range(hours):
        growth = i * 2
        noise = random.randint(-10, 10)
        rag_data.append(base_rag + growth + noise)
    
    return {
        "financial_impact": financial_data,
        "risk_score": risk_data,
        "neural_score": neural_data,
        "rag_memory": rag_data,
        "timestamps": [(now - timedelta(hours=hours-i-1)).isoformat() for i in range(hours)]
    }
