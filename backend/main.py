"""
MariaDB FinOps Auditor - Backend API
"""

import os
import sys
import io
import logging

# Configure logging to console and file
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("server.log", encoding='utf-8')
    ]
)
logger = logging.getLogger("uvicorn")

# Force unbuffered output for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize dependencies
import deps

# Load environment variables
load_dotenv()

# Initialize RAG and shared services
deps.init_rag_services()

# Import Routers
from routers import (
    health,
    simulation,
    risk,
    index,
    healing,
    brain,
    mcp,
    diagnostics,
    analysis,
    metrics,
    metrics_history,
    neural_metrics,
    copilot,
    sandbox,
    cost_attribution,
    wait_events,
    resource_groups,
    plan_stability,
    data_masking,
    schema_drift,
    intelligent_archiving,
    database_branching,
    safe_transaction,
    blast_radius,
    blast_radius,
    vector_optimizer,
    deploy
)

# Import Timing Middleware
from middleware.timing_middleware import TimingMiddleware

app = FastAPI(
    title="MariaDB FinOps Auditor API",
    description="Analyze slow queries and get AI-powered optimization suggestions",
    version="0.1.0"
)

# Performance Timing Middleware (must be added before CORS)
app.add_middleware(TimingMiddleware)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, tags=["Health"])
app.include_router(metrics.router, tags=["Metrics"])
app.include_router(metrics_history.router, tags=["Metrics History"])
app.include_router(neural_metrics.router, tags=["Neural Metrics"])
app.include_router(simulation.router, prefix="/simulation", tags=["Traffic Simulator"])
app.include_router(risk.router, tags=["Risk Predictor"])
app.include_router(index.router, tags=["Index Simulator"])
app.include_router(healing.router, tags=["Self-Healing SQL"])
app.include_router(sandbox.router, tags=["Smart Sandboxing"])
app.include_router(copilot.router, prefix="/copilot", tags=["Copilot"])
app.include_router(sandbox.router, prefix="/sandbox", tags=["Sandbox"])
app.include_router(cost_attribution.router, tags=["Cost Attribution"])
app.include_router(wait_events.router, tags=["Wait Events"])
app.include_router(resource_groups.router, tags=["Resource Groups"])
app.include_router(diagnostics.router, tags=["Diagnostics"])
app.include_router(analysis.router, tags=["Analysis"])
app.include_router(copilot.router, tags=["Copilot"])
app.include_router(brain.router, prefix="/brain", tags=["MariaDB Brain"])
app.include_router(mcp.router, prefix="/mcp", tags=["MCP"])
app.include_router(deploy.router, tags=["Deployment"])

# New Strategic Features (90% → 100% Graal)
app.include_router(plan_stability.router, tags=["Plan Stability"])
app.include_router(data_masking.router, tags=["Data Masking"])
app.include_router(schema_drift.router, tags=["Schema Drift"])
app.include_router(intelligent_archiving.router, tags=["Intelligent Archiving"])
app.include_router(database_branching.router, tags=["Database Branching"])

# Advanced Strategic Features (100% → 120% Graal+)
app.include_router(safe_transaction.router, tags=["Safe Transaction Mode"])
app.include_router(blast_radius.router, tags=["Blast Radius Analyzer"])
app.include_router(vector_optimizer.router, tags=["Vector Optimizer"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
