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
    
    # Financial Impact - trending up (stable)
    base_cost = 14500
    financial_data = []
    for i in range(hours):
        trend = i * 15 # Constant growth
        # Use deterministic "noise" based on index
        noise = (i * 137 % 300) - 150
        financial_data.append(round(base_cost + trend + noise, 2))
    
    # Risk Score - stable high
    risk_data = []
    for i in range(hours):
        base = 85
        wave = 5 * (i % 8) / 8 # Predictable wave
        risk_data.append(round(base + wave, 1))
    
    # Neural Score - Rock solid
    neural_data = [99.2] * hours
    
    # RAG Memory - Growth based on hours
    base_rag = 1250
    rag_data = [base_rag + (i * 3) for i in range(hours)]
    
    return {
        "financial_impact": financial_data,
        "risk_score": risk_data,
        "neural_score": neural_data,
        "rag_memory": rag_data,
        "timestamps": [(now - timedelta(hours=hours-i-1)).isoformat() for i in range(hours)]
    }
