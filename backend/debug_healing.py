import os
import sys
import time
import json
import asyncio
import httpx
import re
from typing import List, Dict, Any

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from rag.vector_store import VectorStore
from rag.embedding_service import EmbeddingService

def print_step(name: str):
    print(f"\n" + "="*60)
    print(f" 🔍 STEP: {name}")
    print("="*60)

async def debug_healing_workflow(test_sql: str = None):
    load_dotenv()
    
    if not test_sql:
        test_sql = "SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE status = 'active')"
    
    print(f"🚀 Starting Self-Healing Debugger")
    print(f"📝 SQL to test: {test_sql}")
    
    # --- STEP 1: Dependencies & Env ---
    print_step("Environment & Dependencies")
    api_key = os.getenv("SKYSQL_API_KEY")
    print(f"✅ SKYSQL_API_KEY: {'Present (Starts with ' + api_key[:8] + '...)' if api_key else '❌ MISSING'}")
    
    try:
        import mariadb
        print(f"✅ MariaDB Driver: Installed")
    except ImportError:
        print(f"❌ MariaDB Driver: NOT INSTALLED")

    # --- STEP 2: Embedding Service ---
    print_step("Local Embedding Service")
    start = time.time()
    try:
        es = EmbeddingService()
        print(f"✅ Model loaded: {es.model_name}")
        
        test_text = "performance optimization"
        emb = es.get_embedding(test_text)
        elapsed = (time.time() - start) * 1000
        print(f"✅ Embedding generated ({len(emb)} dims) in {elapsed:.2f}ms")
    except Exception as e:
        print(f"❌ Embedding failed: {e}")
        return

    # --- STEP 3: Vector Store (SkySQL) ---
    print_step("MariaDB Vector Search (RAG)")
    start = time.time()
    try:
        db_params = {
            "host": os.getenv("SKYSQL_HOST"),
            "port": int(os.getenv("SKYSQL_PORT", 3306)),
            "user": os.getenv("SKYSQL_USERNAME"),
            "password": os.getenv("SKYSQL_PASSWORD"),
            "ssl": True
        }
        vs = VectorStore(db_params)
        count = vs.get_document_count()
        print(f"✅ Knowledge Base: {count} documents matching")
        
        results = vs.search_similar(emb, limit=3)
        elapsed = (time.time() - start) * 1000
        print(f"✅ RAG Search complete in {elapsed:.2f}ms. Found {len(results)} matches.")
        for r in results:
            print(f"   - Match: {r['source_id']} (dist: {r['distance']:.4f})")
    except Exception as e:
        print(f"❌ Vector Store failed: {e}")

    # --- STEP 4: SkyAI Copilot ---
    print_step("SkyAI Copilot (Intelligence)")
    if not api_key:
        print("⚠️ Skipping SkyAI call (No API Key)")
    else:
        start = time.time()
        prompt = f"Optimize this MariaDB query: {test_sql}. Return ONLY valid SQL in a code block."
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.skysql.com/copilot/v1/chat",
                    headers={"X-API-Key": api_key, "Content-Type": "application/json"},
                    json={"prompt": prompt},
                    timeout=20.0
                )
            
            elapsed = (time.time() - start) * 1000
            print(f"📡 API Response Time: {elapsed:.2f}ms (Status: {response.status_code})")
            
            if response.status_code == 200:
                data = response.json()
                msg = data.get("response", data.get("message", "No content"))
                print(f"✅ Raw Intelligence Received:")
                print(f"--- START AI ---")
                print(msg[:500] + "..." if len(msg) > 500 else msg)
                print(f"--- END AI ---")
            else:
                print(f"❌ SkyAI Error: {response.text}")
        except Exception as e:
            print(f"❌ SkyAI Call failed: {e}")

    print("\n" + "="*60)
    print("🏁 Debugging Session Finished")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(debug_healing_workflow())
