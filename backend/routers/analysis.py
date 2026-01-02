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

def get_demo_analysis() -> QueryAnalysis:
    """Return demo data when slow_query_log is disabled"""
    demo_queries = [
        SlowQuery(
            id=1, query_time=2.5, lock_time=0.1, rows_sent=10, rows_examined=5000000,
            sql_text="UPDATE user_stats SET last_calculated = NOW() WHERE user_id IN (SELECT id FROM users WHERE created_at > '2024-01-01')",
            fingerprint="UPDATE user_stats SET last_calculated = ? WHERE user_id IN (SELECT id FROM users WHERE created_at > ?)",
            impact_score=85, estimated_cost_usd=0.26, start_time="2024-05-20 10:15:23", user_host="app_user@10.0.1.25", db="shop_demo"
        ),
        SlowQuery(
            id=2, query_time=1.8, lock_time=0.05, rows_sent=1, rows_examined=1000000,
            sql_text="SELECT * FROM orders WHERE customer_id = 12345",
            fingerprint="SELECT * FROM orders WHERE customer_id = ?",
            impact_score=60, estimated_cost_usd=0.06, start_time="2024-05-20 10:16:05", user_host="analytics@10.0.1.50", db="shop_demo"
        ),
        SlowQuery(
            id=3, query_time=1.2, lock_time=0.2, rows_sent=500, rows_examined=50000,
            sql_text="SELECT p.*, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'",
            fingerprint="SELECT p.*, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?",
            impact_score=45, estimated_cost_usd=0.0125, start_time="2024-05-20 10:18:12", user_host="web_user@10.0.1.10", db="shop_demo"
        )
    ]
    return QueryAnalysis(
        total_queries=len(demo_queries),
        global_score=calculate_global_score(demo_queries),
        top_queries=demo_queries,
        kb_count=1000
    )


@router.get("/analyze", response_model=QueryAnalysis)
async def analyze_slow_queries(limit: int = 10):
    """
    Analyze slow queries - tries SkySQL Observability API first, 
    then mysql.slow_log, then demo table, then mock data.
    """
    rows = []
    
    # === Strategy 1: SkySQL Observability API (Official way) ===
    skysql_api_key = os.getenv("SKYSQL_API_KEY")
    skysql_host = os.getenv("SKYSQL_HOST")
    
    if skysql_api_key:
        print("[/analyze] Trying SkySQL Observability API...")
        try:
            headers = {
                "X-API-Key": skysql_api_key,
                "Content-Type": "application/json"
            }
            
            # Get service ID by matching the hostname
            services_resp = requests.get(
                "https://api.skysql.com/provisioning/v1/services",
                headers=headers,
                timeout=5  # Reduced from 10s
            )
            
            service_id = None
            if services_resp.status_code == 200:
                for svc in services_resp.json():
                    if skysql_host and skysql_host in svc.get('fqdn', ''):
                        service_id = svc.get('id')
                        break
            
            if service_id:
                print(f"[/analyze] Found service ID: {service_id}")
                
                # Query slow query logs from last 24 hours
                now = datetime.now(timezone.utc)
                from_date = (now - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
                to_date = now.strftime("%Y-%m-%dT%H:%M:%SZ")
                
                logs_resp = requests.post(
                    "https://api.skysql.com/observability/v2/logs/query",
                    headers=headers,
                    json={
                        "fromDate": from_date,
                        "toDate": to_date,
                        "logType": ["slow-query-log"],
                        "serverContext": [service_id],
                        "limit": limit
                    },
                    timeout=15  # Reduced from 30s
                )
                
                if logs_resp.status_code == 200:
                    data = logs_resp.json()
                    log_entries = data.get('logs', []) if isinstance(data, dict) else data
                    print(f"[/analyze] SkySQL API returned {len(log_entries)} slow query logs")
                    
                    for i, entry in enumerate(log_entries[:limit]):
                        sql_text = entry.get('message', entry.get('query', str(entry)))
                        timestamp = entry.get('timestamp', entry.get('time', ''))
                        query_time = entry.get('query_time', 1.0)
                        if isinstance(query_time, str):
                            try:
                                query_time = float(query_time)
                            except:
                                query_time = 1.0
                        
                        rows.append({
                            'start_time': timestamp,
                            'user_host': entry.get('user', 'skysql_user'),
                            'query_time': query_time,
                            'lock_time': entry.get('lock_time', 0),
                            'rows_sent': entry.get('rows_sent', 0),
                            'rows_examined': entry.get('rows_examined', 1000),
                            'db': entry.get('db', entry.get('database', 'shop_demo')),
                            'sql_text': sql_text
                        })
                    
                    # Early exit if we found data
                    if rows:
                        print(f"[/analyze] Found {len(rows)} entries from SkySQL API")
                        return rows
                else:
                    print(f"[/analyze] SkySQL API error: {logs_resp.status_code} {logs_resp.text[:200]}")
            else:
                print("[/analyze] Could not find matching service ID")
                
        except Exception as e:
            print(f"[/analyze] SkySQL API failed: {e}")
    else:
        print("[/analyze] SKYSQL_API_KEY not configured, skipping Observability API")
    
    # === Strategy 2: Direct database access ===
    if not rows:
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SHOW GLOBAL VARIABLES LIKE 'slow_query_log'")
            result = cursor.fetchone()
            
            if result and result.get('Value') == 'ON':
                print("[/analyze] Trying mysql.slow_log...")
                try:
                    cursor.execute("""
                        SELECT 
                            start_time, user_host, query_time, lock_time,
                            rows_sent, rows_examined, db, sql_text
                        FROM mysql.slow_log
                        ORDER BY query_time DESC
                        LIMIT %s
                    """, (limit,))
                    rows = cursor.fetchall()
                except Exception as e:
                    print(f"mysql.slow_log access failed: {e}")

            if not rows:
                print("[/analyze] Trying finops_auditor.demo_slow_queries...")
                try:
                    cursor.execute("USE finops_auditor")
                    cursor.execute("""
                        SELECT 
                            start_time, user_host, query_time, lock_time,
                            rows_sent, rows_examined, db, sql_text
                        FROM demo_slow_queries
                        ORDER BY query_time DESC
                        LIMIT %s
                    """, (limit,))
                    rows = cursor.fetchall()
                except Exception as e:
                    print(f"demo_slow_queries access failed: {e}")

            conn.close()
            
        except Exception as e:
            print(f"[/analyze] Database connection failed: {e}")
    
    # === Strategy 3: Hardcoded mock data ===
    if not rows:
        print("[/analyze] No data found. Returning hardcoded mock data.")
        return get_demo_analysis()
    
    queries = []
    for i, row in enumerate(rows):
        query = parse_slow_log_row(row, i + 1)
        queries.append(query)
    
    # Get KB count with caching
    kb_count = 0
    try:
        if deps.vector_store:
            cached_count = document_count_cache.get("kb_count")
            if cached_count is not None:
                kb_count = cached_count
            else:
                kb_count = deps.vector_store.get_document_count()
                document_count_cache.set("kb_count", kb_count)
    except:
        kb_count = 0

    return QueryAnalysis(
        total_queries=len(queries),
        global_score=calculate_global_score(queries),
        top_queries=queries,
        kb_count=kb_count
    )


@router.get("/suggest/{query_id}", response_model=Suggestion)
async def get_suggestion(query_id: int):
    """
    Get AI-powered optimization suggestion for a specific query
    Uses Vector Search + LLM for RAG
    """
    start_total = time.time()
    
    if not deps.rag_enabled:
        return Suggestion(
            query_id=query_id,
            suggestion_type="WARNING",
            suggestion_text="RAG Service unavailable. Please check backend logs and API Keys.",
            query_explanation="Unable to analyze query - RAG service is offline.",
            performance_assessment="Cannot assess performance without AI services.",
            actionable_insights="Please verify GOOGLE_API_KEY and database connection.",
            confidence=0.0,
            sources=[]
        )

    # Mocking retrieval based on ID for demo purposes
    mock_queries = {
        1: "UPDATE user_stats SET last_calculated = NOW() WHERE user_id IN (SELECT id FROM users WHERE created_at > '2024-01-01')",
        2: "SELECT * FROM orders WHERE customer_id = 12345",
        3: "SELECT p.*, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'",
        4: "explain select * from t1 where pk1=1;" 
    }
    
    sql_text = mock_queries.get(query_id, "SELECT * FROM unknown_table")
    fingerprint = deps.parser.normalize_query(sql_text)
    
    # 2. Vector Search for related context (Documentation, Solved Tickets)
    try:
        query_embedding = deps.embedding_service.get_embedding(fingerprint)
        raw_similar_docs = deps.vector_store.search_similar(query_embedding, limit=10) # Get more to allow dedup
        
        # Deduplicate results by base source_id (MDEV-XXXXX)
        seen_base_ids = set()
        similar_docs = []
        for doc in raw_similar_docs:
            source_id = doc.get('source_id', 'unknown')
            base_id = source_id.split('#')[0]
            if base_id not in seen_base_ids:
                seen_base_ids.add(base_id)
                similar_docs.append(doc)
            if len(similar_docs) >= 3:
                break
        
        # 3. Form Context
        context = "\n".join([f"- [{doc['source_type']}] {doc['content'][:300]}..." for doc in similar_docs])
        sources = [f"{doc['source_type']}:{doc['source_id']}" for doc in similar_docs]
        
    except Exception as e:
        print(f"[/suggest] Vector search failed: {e}")
        context = "No historical context available."
        sources = []

    # 4. Generate AI Suggestion
    print(f"[/suggest] Calling AI with context ({len(context)} chars) and {len(sources)} sources...")
    result = deps.suggestion_service.get_suggestion(context, fingerprint)
    print(f"[/suggest] AI returned keys: {list(result.keys())}")
    
    # Calculate Query Cost (Supabase-style estimation)
    # Demo data mapping: query_id -> (rows_examined, rows_sent)
    import math
    demo_data = {
        1: (5_000_000, 10),
        2: (1_000_000, 1),
        3: (50_000, 500)
    }
    rows_examined, rows_sent = demo_data.get(query_id, (1000000, 100))
    
    # Simulate cost: base cost = log10(rows_examined) * 10 (simplified model)
    cost_current = round(math.log10(max(rows_examined, 1)) * 10, 2)
    
    # Projected cost with index: significant reduction based on selectivity
    cost_with_fix = round(math.log10(max(rows_sent * 10, 1)) * 10, 2) if result.get("sql_fix") else None
    
    # Calculate reduction percentage
    cost_reduction = None
    if cost_with_fix and cost_current > 0:
        cost_reduction = round((1 - cost_with_fix / cost_current) * 100, 2)
    
    elapsed_total = (time.time() - start_total) * 1000
    print(f"[PERF] Total /suggest processing took {elapsed_total:.2f}ms")

    return Suggestion(
        query_id=query_id,
        suggestion_type=result.get("suggestion_type", "AI_OPTIMIZATION"),
        suggestion_text=result.get("suggestion_text", result.get("actionable_insights", "No suggestion generated")),
        query_explanation=result.get("query_explanation", "Analyzing query semantics..."),
        performance_assessment=result.get("performance_assessment", "Evaluating performance metrics..."),
        actionable_insights=result.get("actionable_insights", "No specific insights generated."),
        sql_fix=result.get("sql_fix"),
        confidence=result.get("confidence", 0.85),
        confidence_breakdown=result.get("confidence_breakdown", "Based on query pattern analysis and available context."),
        risks=result.get("risks", []),
        sources=sources,
        source_justifications=result.get("source_justifications", {}),
        cost_current=cost_current,
        cost_with_fix=cost_with_fix,
        cost_reduction_percent=cost_reduction,
        analysis_time_ms=round(elapsed_total, 1)
    )
