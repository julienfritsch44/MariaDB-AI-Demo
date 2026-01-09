from fastapi import APIRouter
import os
import time
import requests
import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict

from database import get_db_connection
import deps
from schemas.analysis import SlowQuery, QueryAnalysis, Suggestion
from services.cache import document_count_cache

router = APIRouter()

# Helper Functions (Internal)
def parse_slow_log_row(row: dict, id: int) -> SlowQuery:
    """Parse a row from mysql.slow_log into a SlowQuery object"""
    sql_text = row.get('sql_text', '')
    if isinstance(sql_text, bytes):
        sql_text = sql_text.decode('utf-8', errors='ignore')
    
    query_time = float(row.get('query_time', 0))
    if hasattr(query_time, 'total_seconds'):
        query_time = query_time.total_seconds()
    
    lock_time = float(row.get('lock_time', 0))
    if hasattr(lock_time, 'total_seconds'):
        lock_time = lock_time.total_seconds()
    
    rows_sent = int(row.get('rows_sent', 0))
    rows_examined = int(row.get('rows_examined', 0))
    
    # Calculate impact score and cost using Scorer module
    impact_score = deps.scorer.calculate_score(query_time, rows_examined, rows_sent)
    estimated_cost = deps.scorer.calculate_cost(rows_examined)
    
    return SlowQuery(
        id=id,
        query_time=query_time,
        lock_time=lock_time,
        rows_sent=rows_sent,
        rows_examined=rows_examined,
        sql_text=sql_text[:1000],  # Truncate long queries
        fingerprint=deps.parser.normalize_query(sql_text)[:500],
        impact_score=impact_score,
        estimated_cost_usd=estimated_cost,
        start_time=str(row.get('start_time', '')),
        user_host=str(row.get('user_host', '')),
        db=str(row.get('db', ''))
    )

def calculate_global_score(queries: List[SlowQuery]) -> int:
    """Calculate overall health score (0-100, higher is worse)"""
    if not queries:
        return 0
    avg_score = sum(q.impact_score for q in queries) / len(queries)
    return round(avg_score)



@router.get("/analyze", response_model=QueryAnalysis)
async def analyze_slow_queries(limit: int = 10):
    """
    Analyze slow queries - tries SkySQL Observability API first, 
    then mysql.slow_log. Returns empty results if no real data is available.
    """
    rows = []
    
    # === Strategy 1: SkySQL Observability API (Official way) ===
    skysql_api_key = os.getenv("SKYSQL_API_KEY")
    if skysql_api_key:
        logger.info("[/analyze] Trying SkySQL Observability API...")
        try:
            from services.skysql_observability import observability_service
            raw_logs = await observability_service.get_slow_query_logs(limit=limit)
            for log in raw_logs:
                parsed = observability_service.parse_slow_query_log(log)
                if parsed:
                    rows.append(parsed)
        except Exception as e:
            logger.error(f"[/analyze] SkySQL API failed: {e}")
    
    # === Strategy 2: Direct database access (mysql.slow_log) ===
    if not rows:
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SHOW GLOBAL VARIABLES LIKE 'slow_query_log'")
            result = cursor.fetchone()
            
            # Check for 'Value' or 'value' (MariaDB connector vs others)
            log_enabled = False
            if result:
                log_enabled = str(result.get('Value') or result.get('value', 'OFF')).upper() == 'ON'

            if log_enabled:
                logger.info("[/analyze] Trying mysql.slow_log...")
                cursor.execute(f"SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT {limit}")
                rows = cursor.fetchall()
            
            conn.close()
        except Exception as e:
            logger.warning(f"[/analyze] mysql.slow_log access failed: {e}")
    
    # Process records into SlowQuery objects
    processed_queries = []
    for i, row in enumerate(rows):
        query = parse_slow_log_row(row, i + 1)
        processed_queries.append(query)
    
    # Get KB count from actual VectorStore
    kb_count = 0
    try:
        if deps.vector_store:
            cached_count = document_count_cache.get("kb_count")
            if cached_count is not None:
                kb_count = cached_count
            else:
                kb_count = deps.vector_store.get_document_count()
                document_count_cache.set("kb_count", kb_count)
    except Exception as e:
        logger.warning(f"[/analyze] Failed to get KB count: {e}")

    return QueryAnalysis(
        total_queries=len(processed_queries),
        global_score=calculate_global_score(processed_queries),
        top_queries=processed_queries,
        kb_count=kb_count
    )


@router.get("/suggest/{query_id}", response_model=Suggestion)
async def get_suggestion(query_id: int, sql_text: str = None):
    """
    Get AI-powered optimization suggestion for a specific query
    Uses Vector Search + LLM for RAG
    """
    start_total = time.time()
    
    if not deps.rag_enabled:
        return Suggestion(
            query_id=query_id,
            suggestion_type="ERROR",
            suggestion_text="RAG Services are currently initializing or unavailable.",
            query_explanation="System is in real-mode and requires valid API keys and DB connection.",
            performance_assessment="N/A",
            actionable_insights="Please check backend logs for connection errors.",
            confidence=0.0,
            sources=[]
        )

    # Use provided SQL or fetch from real slow logs if possible
    # For now, we expect the frontend to pass the SQL text it wants to analyze
    if not sql_text:
        # Try to find it in the last analysis results (simplified for now)
        sql_text = "SELECT * FROM orders -- (Replace with real query text from analysis)"
    
    fingerprint = deps.parser.normalize_query(sql_text)
    
    # 2. Vector Search for related context (Documentation, Solved Tickets)
    try:
        query_embedding = deps.embedding_service.get_embedding(fingerprint)
        raw_similar_docs = deps.vector_store.search_similar(query_embedding, limit=5)
        
        # Deduplicate
        seen_base_ids = set()
        similar_docs = []
        for doc in raw_similar_docs:
            source_id = doc.get('source_id', 'unknown')
            base_id = source_id.split('#')[0]
            if base_id not in seen_base_ids:
                seen_base_ids.add(base_id)
                similar_docs.append(doc)
        
        context = "\n".join([f"- [{doc['source_type']}] {doc['content'][:300]}..." for doc in similar_docs])
        sources = [f"{doc['source_type']}:{doc['source_id']}" for doc in similar_docs]
        
    except Exception as e:
        logger.error(f"[/suggest] Vector search failed: {e}")
        context = "No historical context available."
        sources = []

    # 4. Generate AI Suggestion
    logger.info(f"[/suggest] Analyzing query with {len(sources)} real context sources...")
    result = deps.suggestion_service.get_suggestion(context, fingerprint)
    
    # Calculate real-time cost estimation
    rows_examined = 1000 # Default if unknown
    rows_sent = 10
    
    cost_current = round(math.log10(max(rows_examined, 1)) * 10, 2)
    cost_with_fix = round(math.log10(max(rows_sent * 10, 1)) * 10, 2) if result.get("sql_fix") else None
    
    cost_reduction = None
    if cost_with_fix and cost_current > 0:
        cost_reduction = round((1 - cost_with_fix / cost_current) * 100, 2)
    
    elapsed_total = (time.time() - start_total) * 1000

    return Suggestion(
        query_id=query_id,
        suggestion_type=result.get("suggestion_type", "OPTIMIZATION"),
        suggestion_text=result.get("suggestion_text", "No suggestion generated"),
        query_explanation=result.get("query_explanation", "No explanation available"),
        performance_assessment=result.get("performance_assessment", "N/A"),
        actionable_insights=result.get("actionable_insights", "No insights available."),
        sql_fix=result.get("sql_fix"),
        confidence=result.get("confidence", 0.0),
        confidence_breakdown=result.get("confidence_breakdown", ""),
        risks=result.get("risks", []),
        sources=sources,
        source_justifications=result.get("source_justifications", {}),
        cost_current=cost_current,
        cost_with_fix=cost_with_fix,
        cost_reduction_percent=cost_reduction,
        analysis_time_ms=round(elapsed_total, 1)
    )
