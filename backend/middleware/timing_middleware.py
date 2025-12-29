"""
Performance Timing Middleware for FastAPI
Tracks request processing time and exposes metrics
"""

import time
import logging
from collections import deque
from datetime import datetime
from typing import Dict, List
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("uvicorn")

# Store last 100 requests for the metrics endpoint
performance_history: deque = deque(maxlen=100)

# Threshold for logging slow requests (in ms)
SLOW_REQUEST_THRESHOLD_MS = 500


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Measures request processing time
    2. Adds X-Response-Time-Ms header to responses
    3. Logs slow requests (>500ms)
    4. Stores metrics for the /metrics/performance endpoint
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Add timing header
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
        response.headers["Access-Control-Expose-Headers"] = "X-Response-Time-Ms"
        
        # Store metrics
        endpoint = f"{request.method} {request.url.path}"
        metric = {
            "endpoint": endpoint,
            "method": request.method,
            "path": request.url.path,
            "duration_ms": round(duration_ms, 2),
            "status_code": response.status_code,
            "timestamp": datetime.now().isoformat()
        }
        performance_history.append(metric)
        
        # Log slow requests
        if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(f"[SLOW] {endpoint} took {duration_ms:.2f}ms")
        
        return response


def get_performance_metrics() -> Dict:
    """Get aggregated performance metrics"""
    if not performance_history:
        return {
            "total_requests": 0,
            "avg_duration_ms": 0,
            "slow_requests": 0,
            "history": []
        }
    
    history_list = list(performance_history)
    durations = [m["duration_ms"] for m in history_list]
    slow_count = sum(1 for d in durations if d > SLOW_REQUEST_THRESHOLD_MS)
    
    # Group by endpoint
    endpoint_stats: Dict[str, List[float]] = {}
    for m in history_list:
        ep = m["endpoint"]
        if ep not in endpoint_stats:
            endpoint_stats[ep] = []
        endpoint_stats[ep].append(m["duration_ms"])
    
    endpoints_summary = [
        {
            "endpoint": ep,
            "count": len(times),
            "avg_ms": round(sum(times) / len(times), 2),
            "max_ms": round(max(times), 2),
            "min_ms": round(min(times), 2)
        }
        for ep, times in endpoint_stats.items()
    ]
    
    # Sort by average time descending (slowest first)
    endpoints_summary.sort(key=lambda x: x["avg_ms"], reverse=True)
    
    return {
        "total_requests": len(history_list),
        "avg_duration_ms": round(sum(durations) / len(durations), 2),
        "slow_requests": slow_count,
        "slow_threshold_ms": SLOW_REQUEST_THRESHOLD_MS,
        "endpoints": endpoints_summary,
        "history": history_list[-20:]  # Last 20 requests
    }
