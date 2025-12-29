from pydantic import BaseModel
from typing import Optional

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
