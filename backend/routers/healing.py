from fastapi import APIRouter
import deps
from models import RewriteRequest, RewriteResponse, FixRequest, FixResponse

router = APIRouter()

@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_query(request: RewriteRequest):
    """
    🔧 Self-Healing SQL - Automatic query rewriting!
    
    Analyzes a query for anti-patterns and rewrites it for better performance.
    Uses SkyAI Copilot for intelligent rewriting and RAG for historical context.
    
    This is the DBA Dream Feature: auto-fix inefficient queries!
    """
    return await deps.rewriter_service.rewrite_query(request)

@router.post("/execute-fix", response_model=FixResponse)
async def execute_fix(request: FixRequest):
    """
    Execute a suggested optimization fix (e.g. CREATE INDEX)
    WARNING: Only allowing CREATE INDEX/DROP INDEX/ALTER TABLE for demo safety
    """
    result = await deps.rewriter_service.execute_fix(request)
    return FixResponse(**result)
