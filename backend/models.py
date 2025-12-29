from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# =============================================================================
# Slow Query Models
# =============================================================================

class SlowQuery(BaseModel):
    id: int
    query_time: float
    lock_time: float
    rows_sent: int
    rows_examined: int
    sql_text: str
    fingerprint: str
    impact_score: int
    start_time: Optional[str] = None
    user_host: Optional[str] = None
    db: Optional[str] = None


class QueryAnalysis(BaseModel):
    total_queries: int
    global_score: int
    top_queries: List[SlowQuery]
    kb_count: int = 0


class Suggestion(BaseModel):
    query_id: int
    suggestion_type: str = "AI_OPTIMIZATION"
    suggestion_text: str = ""
    query_explanation: str = ""
    performance_assessment: str = ""
    actionable_insights: str = ""
    sql_fix: Optional[str] = None
    confidence: float = 0.0
    confidence_breakdown: str = ""
    risks: List[str] = []
    sources: List[str] = []
    source_justifications: dict = {}
    # Query Cost Analysis (Supabase-style)
    cost_current: Optional[float] = None
    cost_with_fix: Optional[float] = None
    cost_reduction_percent: Optional[float] = None
    analysis_time_ms: Optional[float] = None


# =============================================================================
# Query Risk Predictor Models
# =============================================================================

class PredictRequest(BaseModel):
    sql: str
    database: Optional[str] = None


class SimilarIssue(BaseModel):
    id: str
    title: str
    similarity: float
    summary: str
    analysis: Optional[str] = None


class PredictResponse(BaseModel):
    risk_level: str  # LOW, MEDIUM, HIGH
    risk_score: int  # 0-100
    reason: str
    similar_issues: List[SimilarIssue]
    suggested_fix: Optional[str] = None
    query_analysis: Optional[str] = None


# =============================================================================
# Virtual Index Simulator Models
# =============================================================================

class IndexSimulationRequest(BaseModel):
    sql: str
    proposed_index: str  # e.g. "CREATE INDEX idx_cust ON orders(customer_id)"
    database: Optional[str] = None


class ExplainPlan(BaseModel):
    access_type: str  # "ALL", "ref", "range", "index", "eq_ref", etc.
    rows_examined: int
    key: Optional[str] = None
    key_len: Optional[str] = None
    extra: Optional[str] = None
    estimated_time_ms: float


class IndexSimulationResponse(BaseModel):
    current_plan: ExplainPlan
    with_index_plan: ExplainPlan
    improvement_percent: float
    recommendation: str  # "HIGHLY RECOMMENDED", "RECOMMENDED", "MARGINAL", "NOT RECOMMENDED"
    create_index_sql: str
    ai_analysis: str


# =============================================================================
# Self-Healing SQL Models
# =============================================================================

class RewriteRequest(BaseModel):
    sql: str
    database: Optional[str] = None


class SimilarJiraTicket(BaseModel):
    id: str
    title: str
    similarity: float
    analysis: Optional[str] = None


class RewriteResponse(BaseModel):
    original_sql: str
    rewritten_sql: str
    improvements: List[str]
    estimated_speedup: str
    confidence: float
    explanation: str
    similar_jira_tickets: List[SimilarJiraTicket]
    anti_patterns_detected: List[str] = []
    # Suggested DDL to apply (e.g., CREATE INDEX)
    suggested_ddl: Optional[str] = None
    # Optional simulation data
    simulation: Optional[IndexSimulationResponse] = None


class FixRequest(BaseModel):
    sql: str
    database: Optional[str] = "shop_demo"


class FixResponse(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None
