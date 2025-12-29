from pydantic import BaseModel
from typing import Optional, List

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
