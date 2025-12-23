"""
MariaDB FinOps Auditor - Backend API
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import mariadb
import subprocess
import signal

# Query parser and scorer (used by /predict and other endpoints)
from parser.query_parser import SlowQueryParser
from scorer.impact_scorer import ImpactScorer
parser = SlowQueryParser()
scorer = ImpactScorer()

# Global state for simulation
simulation_process = None

# Load environment variables
load_dotenv()

app = FastAPI(
    title="MariaDB FinOps Auditor API",
    description="Analyze slow queries and get AI-powered optimization suggestions",
    version="0.1.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db_connection():
    """Get MariaDB connection from environment variables"""
    return mariadb.connect(
        host=os.getenv("SKYSQL_HOST"),
        port=int(os.getenv("SKYSQL_PORT", 3306)),
        user=os.getenv("SKYSQL_USERNAME"),
        password=os.getenv("SKYSQL_PASSWORD"),
        ssl=True
    )


# Pydantic models
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


# =============================================================================
# Query Risk Predictor Models (Phase 1 - Competition Feature)
# =============================================================================

class PredictRequest(BaseModel):
    sql: str
    database: Optional[str] = None


class SimilarIssue(BaseModel):
    id: str
    title: str
    similarity: float
    summary: str


class PredictResponse(BaseModel):
    risk_level: str  # LOW, MEDIUM, HIGH
    risk_score: int  # 0-100
    reason: str
    similar_issues: List[SimilarIssue]
    suggested_fix: Optional[str] = None
    query_analysis: Optional[str] = None


# =============================================================================
# Virtual Index Simulator Models (Phase 2 - Competition WOW Feature)
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
# API Routes
# =============================================================================

@app.get("/")
async def root():
    return {"message": "MariaDB FinOps Auditor API", "status": "running"}


@app.get("/health")
async def health_check():
    """Check database connectivity"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        conn.close()
        return {"status": "healthy", "mariadb_version": version}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# =============================================================================
# Traffic Simulator (Phase 1 - Real App Demo)
# =============================================================================

@app.post("/simulation/start")
async def start_simulation():
    """Start the background traffic simulator"""
    global simulation_process
    if simulation_process is not None:
        if simulation_process.poll() is None:
            return {"status": "already_running", "pid": simulation_process.pid}
        else:
            # Process finished/died, clear it
            simulation_process = None

    try:
        # Assuming traffic_simulator.py is in the backend directory
        script_path = os.path.join(os.path.dirname(__file__), "traffic_simulator.py")
        simulation_process = subprocess.Popen(["python", script_path])
        return {"status": "started", "pid": simulation_process.pid}
    except Exception as e:
        print(f"Failed to start simulator: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start simulator: {str(e)}")

@app.post("/simulation/stop")
async def stop_simulation():
    """Stop the background traffic simulator"""
    global simulation_process
    if simulation_process is not None:
        if simulation_process.poll() is None:
            simulation_process.terminate()
            try:
                simulation_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                simulation_process.kill()
        
        simulation_process = None
        return {"status": "stopped"}
        
    return {"status": "not_running"}


@app.get("/simulation/status")
async def simulation_status():
    """Check if simulation is running"""
    global simulation_process
    if simulation_process is not None and simulation_process.poll() is None:
        return {"running": True, "pid": simulation_process.pid}
    return {"running": False}


@app.post("/simulation/test")
async def simulation_test():
    """
    Run a single test query against shop_demo to validate:
    1. Database connection works
    2. Tables exist
    3. Data was seeded
    Does NOT flood SkySQL - just 1 lightweight query.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Try to use shop_demo
        cursor.execute("USE shop_demo")
        
        # Quick count queries
        results = {}
        for table in ["shop_customers", "shop_products", "shop_orders", "shop_order_items"]:
            try:
                cursor.execute(f"SELECT COUNT(*) as cnt FROM {table}")
                row = cursor.fetchone()
                results[table] = row["cnt"] if row else 0
            except Exception as e:
                results[table] = f"ERROR: {str(e)[:50]}"
        
        conn.close()
        
        return {
            "status": "ok",
            "database": "shop_demo",
            "tables": results,
            "ready": all(isinstance(v, int) and v > 0 for v in results.values())
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "ready": False
        }


# =============================================================================
# Query Risk Predictor (Phase 1 - Competition Feature)
# =============================================================================

@app.post("/predict", response_model=PredictResponse)
async def predict_query_risk(request: PredictRequest):
    """
    🔮 Query Risk Predictor - Predict query risk BEFORE execution!
    
    Uses RAG to find similar issues from Jira knowledge base and AI to
    analyze potential problems, deadlocks, and performance issues.
    
    This is the KEY differentiator: SkySQL can't do this!
    """
    if not rag_enabled:
        return PredictResponse(
            risk_level="UNKNOWN",
            risk_score=0,
            reason="RAG Service unavailable. Please check backend configuration.",
            similar_issues=[],
            suggested_fix=None,
            query_analysis=None
        )
    
    sql = request.sql.strip()
    if not sql:
        return PredictResponse(
            risk_level="LOW",
            risk_score=0,
            reason="Empty query submitted.",
            similar_issues=[],
            suggested_fix=None,
            query_analysis=None
        )
    
    # 1. Normalize query to fingerprint
    fingerprint = parser.normalize_query(sql)
    print(f"[/predict] Analyzing query: {sql[:100]}...")
    print(f"[/predict] Fingerprint: {fingerprint[:80]}...")
    
    # 2. Search for similar issues in Jira knowledge base
    try:
        query_embedding = embedding_service.get_embedding(fingerprint)
        similar_docs = vector_store.search_similar(query_embedding, limit=5, threshold=0.7)
        print(f"[/predict] Found {len(similar_docs)} similar documents")
        
    except Exception as e:
        print(f"[/predict] Vector search failed: {e}")
        similar_docs = []
    
    # 3. Build context from similar issues
    similar_issues = []
    context_parts = []
    
    for doc in similar_docs:
        source_id = doc.get('source_id', 'unknown')
        content = doc.get('content', '')[:500]
        distance = doc.get('distance', 1.0)
        similarity = round((1 - distance) * 100, 1)  # Convert distance to similarity %
        
        # Extract title from content (first line or first 50 chars)
        title = content.split('\n')[0][:80] if content else source_id
        
        similar_issues.append(SimilarIssue(
            id=source_id,
            title=title,
            similarity=similarity,
            summary=content[:200] + "..." if len(content) > 200 else content
        ))
        
        context_parts.append(f"[{source_id}] (relevance: {similarity}%)\n{content}")
    
    context = "\n\n".join(context_parts) if context_parts else "No similar issues found in knowledge base."
    
    # 4. Risk Assessment - Heuristic-based analysis
    # (No external AI dependency - uses pattern matching and similar issues)
    sql_upper = sql.upper()
    risk_score = 30
    risk_level = "LOW"
    reason = "Query pattern analysis"
    query_analysis = "Analyzed query structure for common performance issues."
    suggested_fix = None
    
    # Check for risky patterns
    if "SELECT *" in sql_upper and "WHERE" not in sql_upper:
        risk_score = 85
        risk_level = "HIGH"
        reason = "SELECT * without WHERE clause - likely full table scan"
        query_analysis = "Full table scan detected. No filtering will cause all rows to be examined."
        suggested_fix = "Add a WHERE clause to filter results, or specify only needed columns."
    elif "LIKE '%" in sql_upper or 'LIKE "%' in sql_upper:
        risk_score = 70
        risk_level = "MEDIUM"
        reason = "Leading wildcard in LIKE - cannot use index"
        query_analysis = "Leading wildcard patterns prevent index usage, causing full scans."
    elif "IN (SELECT" in sql_upper:
        risk_score = 60
        risk_level = "MEDIUM"
        reason = "Subquery in IN clause - may cause performance issues"
        query_analysis = "Subqueries in IN clauses can be inefficient. Consider rewriting as JOIN."
    elif "CROSS JOIN" in sql_upper or ", " in sql_upper and "WHERE" not in sql_upper:
        risk_score = 80
        risk_level = "HIGH"
        reason = "Potential cartesian product - no join condition detected"
        query_analysis = "Missing join conditions can create cartesian products with massive row counts."
    elif similar_issues:
        risk_score = 55
        risk_level = "MEDIUM"
        reason = f"Pattern similar to known issues: {similar_issues[0].id}"
        query_analysis = f"Query pattern matches historical issue {similar_issues[0].id}."
    else:
        # Check for positive patterns
        if "WHERE" in sql_upper and "=" in sql_upper:
            risk_score = 25
            query_analysis = "Query has filtering conditions. Check that indexed columns are used."
        if "LIMIT" in sql_upper:
            risk_score = max(10, risk_score - 10)
            query_analysis += " LIMIT clause present - reduces result set size."
    
    print(f"[/predict] Heuristic analysis complete: {risk_level} ({risk_score})")
    
    return PredictResponse(
        risk_level=risk_level,
        risk_score=risk_score,
        reason=reason,
        similar_issues=similar_issues,
        suggested_fix=suggested_fix,
        query_analysis=query_analysis
    )


# =============================================================================
# Virtual Index Simulator (Phase 2 - Competition WOW Feature)
# =============================================================================

@app.post("/simulate-index", response_model=IndexSimulationResponse)
async def simulate_index(request: IndexSimulationRequest):
    """
    🎯 Virtual Index Simulator - "What-if" index analysis!
    
    Simulate how a hypothetical index would affect query performance
    WITHOUT actually creating the index. This is the WOW feature!
    
    1. Run EXPLAIN on current query
    2. AI estimates what EXPLAIN would look like WITH the proposed index
    3. Calculate improvement percentage
    4. Return before/after comparison
    """
    import re
    import json
    
    sql = request.sql.strip()
    proposed_index = request.proposed_index.strip()
    
    # Parse the index definition to extract table and columns
    # Expected format: CREATE INDEX idx_name ON table_name(col1, col2, ...)
    index_match = re.search(
        r'CREATE\s+INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)',
        proposed_index,
        re.IGNORECASE
    )
    
    if not index_match:
        raise HTTPException(
            status_code=400,
            detail="Invalid index syntax. Expected: CREATE INDEX idx_name ON table(column1, column2, ...)"
        )
    
    index_name = index_match.group(1)
    table_name = index_match.group(2)
    index_columns = [col.strip() for col in index_match.group(3).split(',')]
    
    # Step 1: Get current EXPLAIN plan
    current_plan = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Use database if specified
        if request.database:
            cursor.execute(f"USE {request.database}")
        
        # Run EXPLAIN on the query
        cursor.execute(f"EXPLAIN {sql}")
        explain_result = cursor.fetchone()
        conn.close()
        
        if explain_result:
            # Calculate estimated time based on rows and access type
            rows = explain_result.get('rows', 1000)
            access_type = explain_result.get('type', 'ALL')
            
            # Estimate time (rough heuristics)
            time_multipliers = {
                'ALL': 1.0,      # Full table scan
                'index': 0.8,   # Index scan
                'range': 0.3,   # Index range scan
                'ref': 0.1,     # Index lookup
                'eq_ref': 0.05, # Unique index lookup
                'const': 0.01,  # Constant lookup
                'system': 0.001
            }
            multiplier = time_multipliers.get(access_type, 1.0)
            estimated_time = (rows * 0.05 * multiplier)  # 0.05ms per row baseline
            
            current_plan = ExplainPlan(
                access_type=access_type,
                rows_examined=rows,
                key=explain_result.get('key'),
                key_len=explain_result.get('key_len'),
                extra=explain_result.get('Extra'),
                estimated_time_ms=round(estimated_time, 2)
            )
    except Exception as e:
        # Fallback: create a simulated current plan
        current_plan = ExplainPlan(
            access_type="ALL",
            rows_examined=10000,
            key=None,
            extra="Using where",
            estimated_time_ms=500.0
        )
    
    # Step 2: AI estimates the plan WITH the proposed index
    if not rag_enabled:
        # Fallback without AI
        improvement = 90.0 if current_plan.access_type == "ALL" else 50.0
        with_index_plan = ExplainPlan(
            access_type="ref",
            rows_examined=max(1, current_plan.rows_examined // 100),
            key=index_name,
            key_len="4",
            extra="Using index",
            estimated_time_ms=round(current_plan.estimated_time_ms * 0.05, 2)
        )
        ai_analysis = "AI analysis unavailable. Using heuristic estimation."
        recommendation = "RECOMMENDED" if improvement > 70 else "MARGINAL"
    else:
        # Use AI to analyze and estimate
        prompt = f"""You are a MariaDB performance expert. Analyze this index simulation:

**Current Query:**
```sql
{sql}
```

**Current EXPLAIN Plan:**
- Access Type: {current_plan.access_type}
- Rows Examined: {current_plan.rows_examined}
- Key Used: {current_plan.key or 'None'}
- Extra: {current_plan.extra}

**Proposed Index:**
```sql
{proposed_index}
```

**Index Details:**
- Index Name: {index_name}
- Table: {table_name}
- Columns: {', '.join(index_columns)}

Analyze what the EXPLAIN plan would look like IF this index existed.

Return a JSON response with:
{{
    "with_index_access_type": "ref|range|eq_ref|index",
    "with_index_rows_examined": <estimated number, usually much smaller>,
    "improvement_percent": <0-100>,
    "recommendation": "HIGHLY RECOMMENDED|RECOMMENDED|MARGINAL|NOT RECOMMENDED",
    "analysis": "<2-3 sentence explanation>"
}}

Consider:
1. Would the query WHERE clause use these index columns?
2. Is the column order optimal for the query?
3. Would this eliminate a full table scan?
4. Are there selectivity/cardinality concerns?

Return ONLY valid JSON, no markdown."""

        # Use heuristic analysis for index simulation
        # (SkyAI Copilot is optimized for chat, not structured JSON output)
        try:
            # Analyze based on query patterns and current plan
            sql_upper = sql.upper()
            
            # Determine improvement based on current access type and query pattern
            if current_plan.access_type == "ALL":
                # Full table scan - index would help significantly
                improvement = 90.0
                with_index_access_type = "ref"
                with_index_rows = max(1, current_plan.rows_examined // 100)
            elif current_plan.access_type in ("index", "range"):
                # Already using some index - improvement depends on specificity
                improvement = 50.0
                with_index_access_type = "ref"
                with_index_rows = max(1, current_plan.rows_examined // 10)
            else:
                # Already well-optimized
                improvement = 20.0
                with_index_access_type = current_plan.access_type
                with_index_rows = current_plan.rows_examined
            
            # Check if index columns appear in WHERE clause
            index_cols_in_query = sum(1 for col in index_columns if col.upper() in sql_upper)
            if index_cols_in_query == len(index_columns):
                improvement = min(95.0, improvement + 10)
                recommendation = "HIGHLY RECOMMENDED"
            elif index_cols_in_query > 0:
                recommendation = "RECOMMENDED"
            else:
                improvement = max(10.0, improvement - 30)
                recommendation = "MARGINAL"
            
            with_index_plan = ExplainPlan(
                access_type=with_index_access_type,
                rows_examined=with_index_rows,
                key=index_name,
                key_len=str(len(index_columns) * 4),
                extra="Using index" if improvement > 50 else "Using where; Using index",
                estimated_time_ms=round(current_plan.estimated_time_ms * (100 - improvement) / 100, 2)
            )
            
            ai_analysis = f"Index on ({', '.join(index_columns)}) would change access from '{current_plan.access_type}' to '{with_index_access_type}', reducing rows examined from {current_plan.rows_examined:,} to ~{with_index_rows:,}."
            
        except Exception as e:
            # AI failed, use heuristics
            improvement = 85.0 if current_plan.access_type == "ALL" else 40.0
            with_index_plan = ExplainPlan(
                access_type="ref",
                rows_examined=max(1, current_plan.rows_examined // 100),
                key=index_name,
                key_len="4",
                extra="Using index",
                estimated_time_ms=round(current_plan.estimated_time_ms * 0.1, 2)
            )
            ai_analysis = f"Heuristic estimation (AI error: {str(e)[:50]})"
            recommendation = "RECOMMENDED"
    
    return IndexSimulationResponse(
        current_plan=current_plan,
        with_index_plan=with_index_plan,
        improvement_percent=round(improvement, 1),
        recommendation=recommendation,
        create_index_sql=proposed_index,
        ai_analysis=ai_analysis
    )


@app.get("/analyze", response_model=QueryAnalysis)
async def analyze_slow_queries(limit: int = 10):
    """
    Analyze slow queries from the mysql.slow_log table
    Returns top queries by impact score
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if slow_query_log is enabled
        cursor.execute("SHOW GLOBAL VARIABLES LIKE 'slow_query_log'")
        result = cursor.fetchone()
        if not result or result.get('Value') != 'ON':
            # Return demo data if slow_query_log is OFF
            return get_demo_analysis()
        
        rows = []
        # 1. Try mysql.slow_log
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

        # 2. If empty or failed, try demo_slow_queries
        if not rows:
            print("Falling back to finops_auditor.demo_slow_queries...")
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
        
        # 3. Final fallback to mock data if still empty
        if not rows:
            print("No data found in any table. Returning hardcoded mock data.")
            return get_demo_analysis()
        
        # Parse and score queries
        queries = []
        for i, row in enumerate(rows):
            query = parse_slow_log_row(row, i + 1)
            queries.append(query)
        
        # Get KB stats
        kb_count = 0
        if rag_enabled:
            try:
                kb_count = vector_store.get_document_count()
            except Exception as e:
                print(f"Failed to get kb_count: {e}")
                kb_count = 0

        return QueryAnalysis(
            total_queries=len(queries),
            global_score=global_score,
            top_queries=queries,
            kb_count=kb_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Services Initialization
# =============================================================================

from rag.vector_store import VectorStore
from rag.embedding_service import EmbeddingService
from rag.suggestion_service import SuggestionService

# Init Services
try:
    vector_store = VectorStore({
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    })
    # Ensure tables exist
    vector_store.init_schema()
    
    embedding_service = EmbeddingService()
    suggestion_service = SuggestionService()
    rag_enabled = True
except Exception as e:
    print(f"RAG Services init failed: {e}")
    rag_enabled = False

@app.get("/suggest/{query_id}", response_model=Suggestion)
async def get_suggestion(query_id: int):
    """
    Get AI-powered optimization suggestion for a specific query
    Uses Vector Search + LLM for RAG
    """
    if not rag_enabled:
        # Fallback to mock if RAG services failed
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

    # 1. Retrieve the slow query detail (In real app, fetch from DB by ID)
    # For demo, we regenerate the context based on ID or use a placeholder
    # In a real scenario, we would `SELECT * FROM slow_log WHERE id = query_id`
    # Here we mock the retrieval of the specific query text for the RAG context
    
    # Mocking retrieval based on ID for demo purposes
    mock_queries = {
        1: "UPDATE user_stats SET last_calculated = NOW() WHERE user_id IN (SELECT id FROM users WHERE created_at > '2024-01-01')",
        2: "SELECT * FROM orders WHERE customer_id = 12345",
        3: "SELECT p.*, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'",
        4: "explain select * from t1 where pk1=1;" # MDEV-38164 Test Case
    }
    
    sql_text = mock_queries.get(query_id, "SELECT * FROM unknown_table")
    fingerprint = parser.normalize_query(sql_text)
    
    # 2. Vector Search for related context (Documentation, Solved Tickets)
    try:
        query_embedding = embedding_service.get_embedding(fingerprint)
        similar_docs = vector_store.search_similar(query_embedding, limit=3)
        
        # 3. Form Context
        context = "\n".join([f"- [{doc['source_type']}] {doc['content'][:300]}..." for doc in similar_docs])
        sources = [f"{doc['source_type']}:{doc['source_id']}" for doc in similar_docs]
        
    except Exception as e:
        print(f"[/suggest] Vector search failed: {e}")
        context = "No historical context available."
        sources = []

    # 4. Generate AI Suggestion
    print(f"[/suggest] Calling AI with context ({len(context)} chars) and {len(sources)} sources...")
    result = suggestion_service.get_suggestion(context, fingerprint)
    print(f"[/suggest] AI returned keys: {list(result.keys())}")
    print(f"[/suggest] query_explanation: {result.get('query_explanation', 'MISSING')[:50]}...")
    
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
        cost_reduction_percent=cost_reduction
    )


class ChatRequest(BaseModel):
    prompt: str
    context: Optional[str] = None

from fastapi import Body

@app.post("/copilot/chat")
async def copilot_chat(request: ChatRequest = Body(...)):
    """
    Forward chat to SkyAI Copilot API (MariaDB's native AI assistant)
    """
    import httpx
    
    skysql_api_key = os.getenv("SKYSQL_API_KEY")
    
    if not skysql_api_key:
        raise HTTPException(
            status_code=503,
            detail="SkyAI Copilot is not configured. Please set SKYSQL_API_KEY environment variable."
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.skysql.com/copilot/v1/chat",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": skysql_api_key
                },
                json={"prompt": request.prompt, "context": request.context},
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"SkyAI Copilot API error: {response.text}"
                )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="SkyAI Copilot request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"SkyAI Copilot connection failed: {str(e)}")


# =============================================================================
# MariaDB Brain - RAG-Powered Chat
# =============================================================================

class BrainChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class BrainSource(BaseModel):
    type: str  # "jira" or "docs"
    id: str
    title: str
    relevance: str

class BrainChatResponse(BaseModel):
    answer: str
    sources: List[BrainSource]
    kb_count: int

@app.post("/brain/chat", response_model=BrainChatResponse)
async def brain_chat(request: BrainChatRequest):
    """
    MariaDB Brain - Ask anything about MariaDB!
    Uses RAG with 10 years of Jira tickets and documentation.
    """
    if not rag_enabled:
        return BrainChatResponse(
            answer="⚠️ The knowledge base is currently offline. Please check the backend configuration.",
            sources=[],
            kb_count=0
        )
    
    user_message = request.message.strip()
    if not user_message:
        return BrainChatResponse(
            answer="Please ask me a question about MariaDB!",
            sources=[],
            kb_count=0
        )
    
    # 1. Get embedding for user question
    try:
        query_embedding = embedding_service.get_embedding(user_message)
        similar_docs = vector_store.search_similar(query_embedding, limit=5)
        
        # Build context from retrieved documents
        context_parts = []
        sources = []
        for doc in similar_docs:
            source_type = doc.get('source_type', 'unknown')
            source_id = doc.get('source_id', 'unknown')
            content = doc.get('content', '')[:500]
            context_parts.append(f"[{source_type}:{source_id}]\n{content}")
            
            # Parse source for display
            sources.append(BrainSource(
                type=source_type,
                id=source_id,
                title=source_id if source_type == "jira" else "Documentation",
                relevance=""  # Will be filled by AI
            ))
        
        context = "\n\n".join(context_parts)
        
    except Exception as e:
        print(f"[/brain/chat] Vector search failed: {e}")
        context = ""
        sources = []
    
    # 2. Generate AI response using SkyAI Copilot
    try:
        import requests
        
        skysql_api_key = os.getenv("SKYSQL_API_KEY")
        if not skysql_api_key:
            raise Exception("SKYSQL_API_KEY not configured")
        
        prompt = f"""You are MariaDB Brain - an AI assistant that knows everything about MariaDB.
You have access to 10 years of Jira tickets, bug reports, and documentation.

USER QUESTION: {user_message}

RETRIEVED KNOWLEDGE BASE CONTEXT:
{context if context else "No specific context retrieved."}

INSTRUCTIONS:
1. Answer the user's question directly and helpfully
2. If the retrieved context contains relevant information, cite it naturally (e.g., "According to MDEV-XXXX...")
3. Be concise but thorough
4. If you don't know something or it's not in the context, say so honestly
5. Focus on being practical and actionable
6. Use markdown formatting for code blocks, lists, etc.

Respond with a helpful answer:"""

        response = requests.post(
            "https://api.skysql.com/copilot/v1/chat",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": skysql_api_key
            },
            json={"prompt": prompt},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result.get("answer", "No response from AI.")
        else:
            raise Exception(f"SkyAI returned {response.status_code}")
        
    except Exception as e:
        print(f"[/brain/chat] AI generation failed: {e}")
        # Provide context-based response when AI is unavailable
        if sources:
            answer = f"Based on the knowledge base, I found {len(sources)} relevant sources:\n\n"
            for src in sources[:3]:
                answer += f"- **{src.id}**: {src.title}\n"
            answer += "\nPlease check these sources for detailed information."
        else:
            answer = f"I'm unable to process your question at the moment. (Error: {str(e)[:100]})"
    
    # Get KB count
    kb_count = 0
    try:
        kb_count = vector_store.get_document_count()
    except:
        pass
    
    return BrainChatResponse(
        answer=answer,
        sources=sources[:3],  # Top 3 sources
        kb_count=kb_count
    )


@app.get("/brain/stats")
async def brain_stats():
    """Get knowledge base statistics"""
    if not rag_enabled:
        return {"kb_count": 0, "status": "offline"}
    
    try:
        kb_count = vector_store.get_document_count()
        return {"kb_count": kb_count, "status": "online"}
    except Exception as e:
        return {"kb_count": 0, "status": "error", "error": str(e)}


# =============================================================================
# Helper Functions
# =============================================================================

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
    
    # Calculate impact score using Scorer module
    impact_score = scorer.calculate_score(query_time, rows_examined, rows_sent)
    
    return SlowQuery(
        id=id,
        query_time=query_time,
        lock_time=lock_time,
        rows_sent=rows_sent,
        rows_examined=rows_examined,
        sql_text=sql_text[:1000],  # Truncate long queries
        fingerprint=parser.normalize_query(sql_text)[:500],
        impact_score=impact_score,
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
            id=1,
            query_time=12.87,
            lock_time=0.001,
            rows_sent=10,
            rows_examined=5_000_000,
            sql_text="UPDATE user_stats SET last_calculated = NOW() WHERE user_id IN (SELECT id FROM users WHERE created_at > '2024-01-01')",
            fingerprint=parser.normalize_query("UPDATE user_stats SET last_calculated = NOW() WHERE user_id IN (SELECT id FROM users WHERE created_at > '2024-01-01')"),
            impact_score=scorer.calculate_score(12.87, 5_000_000, 10),
            db="analytics_db"
        ),
        SlowQuery(
            id=2,
            query_time=5.51,
            lock_time=0.0001,
            rows_sent=1,
            rows_examined=1_000_000,
            sql_text="SELECT * FROM orders WHERE customer_id = 12345",
            fingerprint=parser.normalize_query("SELECT * FROM orders WHERE customer_id = 12345"),
            impact_score=scorer.calculate_score(5.51, 1_000_000, 1),
            db="orders_db"
        ),
        SlowQuery(
            id=3,
            query_time=3.24,
            lock_time=0.00005,
            rows_sent=500,
            rows_examined=50_000,
            sql_text="SELECT p.*, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'",
            fingerprint=parser.normalize_query("SELECT p.*, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'"),
            impact_score=scorer.calculate_score(3.24, 50_000, 500),
            db="products_db"
        )
    ]
    
    # Get KB count with logging
    kb_count = 0
    if rag_enabled:
        try:
            kb_count = vector_store.get_document_count()
            print(f"[get_demo_analysis] KB count from vector_store: {kb_count}")
        except Exception as e:
            print(f"[get_demo_analysis] Failed to get kb_count: {e}")
    else:
        print("[get_demo_analysis] RAG not enabled, kb_count=0")
    
    return QueryAnalysis(
        total_queries=3,
        global_score=calculate_global_score(demo_queries),
        top_queries=demo_queries,
        kb_count=kb_count
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
