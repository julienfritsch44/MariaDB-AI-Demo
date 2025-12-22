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
    suggestion_type: str  # "index", "rewrite", "config"
    suggestion_text: str  # Kept for compatibility, but we prefer structured fields
    query_explanation: str
    performance_assessment: str
    actionable_insights: str
    sql_fix: Optional[str] = None
    confidence: float
    sources: List[str]
    source_justifications: dict = {}


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
from rag.gemini_service import GeminiService

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
    
    gemini_service = GeminiService()
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
        query_embedding = gemini_service.get_embedding(fingerprint)
        similar_docs = vector_store.search_similar(query_embedding, limit=3)
        
        # 3. Form Context
        context = "\n".join([f"- [{doc['source_type']}] {doc['content'][:300]}..." for doc in similar_docs])
        sources = [f"{doc['source_type']}:{doc['source_id']}" for doc in similar_docs]
        
    except Exception as e:
        print(f"Vector search failed: {e}")
        context = "No historical context available."
        sources = []

    # 4. Generate AI Suggestion
    result = gemini_service.get_suggestion(context, fingerprint)
    
    return Suggestion(
        query_id=query_id,
        suggestion_type=result.get("suggestion_type", "AI_OPTIMIZATION"),
        suggestion_text=result.get("suggestion_text", result.get("actionable_insights", "No suggestion generated")),
        query_explanation=result.get("query_explanation", "Analyzing query semantics..."),
        performance_assessment=result.get("performance_assessment", "Evaluating performance metrics..."),
        actionable_insights=result.get("actionable_insights", "No specific insights generated."),
        sql_fix=result.get("sql_fix"),
        confidence=result.get("confidence", 0.85),
        sources=sources,
        source_justifications=result.get("source_justifications", {})
    )


@app.post("/copilot/chat")
async def copilot_chat(prompt: str):
    """
    Forward chat to SkyAI Copilot API, or fallback to Gemini
    """
    import httpx
    
    api_key = os.getenv("SKYSQL_API_KEY")
    
    # 1. Try SkySQL Copilot first
    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.skysql.com/copilot/v1/chat",
                    headers={
                        "Content-Type": "application/json",
                        "X-API-Key": api_key
                    },
                    json={"prompt": prompt},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"SkySQL Copilot API returned {response.status_code}. Falling back to Gemini.")
        except Exception as e:
            print(f"SkySQL Copilot API connection failed: {e}. Falling back to Gemini.")

    # 2. Fallback to Gemini (via GeminiService)
    print("Using Gemini fallback for Copilot chat.")
    try:
        # Use a simpler prompt for general chat
        chat_prompt = f"You are a MariaDB database assistant. The user says: {prompt}. Provide a helpful, technical response."
        
        # We can reuse get_suggestion model call but with a different prompt
        # Or just call genai directly here for simplicity
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash") # Direct fallback
        res = model.generate_content(chat_prompt)
        
        return {"answer": res.text, "source": "Gemini Fallback"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"All chat services failed: {str(e)}")


# =============================================================================
# Helper Functions (Moved to modules)
# =============================================================================

from parser.query_parser import SlowQueryParser
from scorer.impact_scorer import ImpactScorer

parser = SlowQueryParser()
scorer = ImpactScorer()

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
    
    return QueryAnalysis(
        total_queries=3,
        global_score=calculate_global_score(demo_queries),
        top_queries=demo_queries
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
