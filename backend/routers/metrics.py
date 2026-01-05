"""
Performance Metrics Router
Exposes endpoint for frontend to fetch performance data
"""

from fastapi import APIRouter
from middleware.timing_middleware import get_performance_metrics
from mock_data import MockDataGenerator

router = APIRouter()


@router.get("/metrics/performance")
async def get_metrics():
    """
    Get performance metrics for all endpoints.
    Returns:
    - total_requests: Total number of tracked requests
    - avg_duration_ms: Average response time
    - slow_requests: Count of requests exceeding threshold
    - endpoints: Per-endpoint statistics (sorted by slowest first)
    - history: Last 20 requests with timing details
    """
    return get_performance_metrics()


@router.get("/executive/summary")
async def get_executive_summary():
    """
    Get executive summary for dashboard.
    Returns high-level metrics including financial savings, incidents prevented,
    optimizations applied, and compliance status.
    """
    return MockDataGenerator.get_executive_summary()
