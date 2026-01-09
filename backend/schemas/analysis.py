from pydantic import BaseModel
from typing import Optional, List

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
    estimated_cost_usd: Optional[float] = 0.0
    explain: Optional[str] = None
    query_plan: Optional[str] = None


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
