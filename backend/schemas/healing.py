from pydantic import BaseModel
from typing import Optional, List
from .simulation import IndexSimulationResponse

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
    # Optional simulation data
    simulation: Optional[IndexSimulationResponse] = None


class FixRequest(BaseModel):
    sql: str
    database: Optional[str] = "shop_demo"


class FixResponse(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None
