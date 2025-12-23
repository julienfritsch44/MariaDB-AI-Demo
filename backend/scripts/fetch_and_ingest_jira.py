"""
Jira Fetcher and Ingester for MariaDB FinOps Auditor
Fetches optimizer-related bugs from MariaDB Jira and ingests into vector store
"""

import os
import sys
import json
import time
import requests
from typing import List, Dict

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.vector_store import VectorStore
from rag.embedding_service import EmbeddingService
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Config
JIRA_BASE_URL = "https://jira.mariadb.org"
JIRA_JQL = 'type = Bug and project = "MariaDB Server" and resolution = fixed and (labels in (optimizer, slow_query) or component in (Optimizer, "Optimizer - CTE", "Optimizer - Window functions"))'
BATCH_SIZE = 100  # Issues per Jira request
EMBEDDING_DELAY = 0.05  # Seconds delay (local model is fast)
JIRA_DELAY = 1  # Seconds between Jira API calls

def get_db_params():
    return {
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    }

def fetch_jira_issues() -> List[Dict]:
    """Fetch all issues from Jira API in batches"""
    all_issues = []
    start_at = 0
    total = None
    
    print(f"[FETCH] Fetching issues from Jira with JQL:")
    print(f"   {JIRA_JQL[:80]}...")
    
    while True:
        url = f"{JIRA_BASE_URL}/rest/api/2/search"
        params = {
            "jql": JIRA_JQL,
            "startAt": start_at,
            "maxResults": BATCH_SIZE,
            "fields": "key,summary,description,comment"
        }
        
        print(f"\n[BATCH] Fetching: startAt={start_at}, maxResults={BATCH_SIZE}")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if total is None:
                total = data.get("total", 0)
                print(f"   Total issues to fetch: {total}")
            
            issues = data.get("issues", [])
            all_issues.extend(issues)
            
            print(f"   [OK] Fetched {len(issues)} issues (Total so far: {len(all_issues)}/{total})")
            
            # Check if we've fetched all
            if len(all_issues) >= total or len(issues) == 0:
                break
            
            start_at += BATCH_SIZE
            time.sleep(JIRA_DELAY)  # Be nice to Jira server
            
        except requests.exceptions.RequestException as e:
            print(f"   [ERROR] Error fetching batch: {e}")
            break
    
    print(f"\n[DONE] Fetched {len(all_issues)} issues total")
    return all_issues

def save_issues_to_json(issues: List[Dict], filepath: str):
    """Save issues to JSON file"""
    data = {
        "total": len(issues),
        "issues": issues
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"[SAVE] Saved {len(issues)} issues to {filepath}")

def prepare_document(issue: Dict) -> Dict:
    """Convert Jira issue to document format"""
    key = issue.get('key', '')
    fields = issue.get('fields', {})
    summary = fields.get('summary', '')
    description = fields.get('description', '') or ''
    
    # Extract comments if available
    comments_data = fields.get('comment', {})
    comments = comments_data.get('comments', []) if isinstance(comments_data, dict) else []
    comment_text = "\n".join([c.get('body', '')[:500] for c in comments[:3]])  # First 3 comments, truncated
    
    # Combine text
    full_text = f"Ticket: {key}\nTitle: {summary}\n\nDescription: {description[:2000]}"
    if comment_text:
        full_text += f"\n\nResolution Notes:\n{comment_text[:1000]}"
    
    return {
        "source_type": "jira",
        "source_id": key,
        "content": full_text
    }

def ingest_to_vector_store(issues: List[Dict]):
    """Ingest issues into vector store"""
    print("\n[INGEST] Starting ingestion into MariaDB Vector Store...")
    
    # Init services
    try:
        store = VectorStore(get_db_params())
        store.init_schema()
        print("   [OK] Vector Store connected")
    except Exception as e:
        print(f"   [ERROR] Failed to connect: {e}")
        return
    
    embedding_service = EmbeddingService()
    print(f"   [OK] Embedding model loaded: {embedding_service.model_name}")
    
    # Get existing document IDs to avoid duplicates
    existing_count = store.get_document_count()
    print(f"   [INFO] Existing documents in DB: {existing_count}")
    
    # Process each issue
    success = 0
    skipped = 0
    errors = 0
    
    for i, issue in enumerate(issues):
        doc = prepare_document(issue)
        
        if (i + 1) % 50 == 0 or i == 0:
            print(f"   Processing {i+1}/{len(issues)}: {doc['source_id']}...")
        
        try:
            embedding = embedding_service.get_embedding(doc['content'])
            
            if embedding:
                store.add_document(
                    source_type=doc['source_type'],
                    source_id=doc['source_id'],
                    content=doc['content'],
                    embedding=embedding
                )
                success += 1
            else:
                skipped += 1
                
            time.sleep(EMBEDDING_DELAY)  # Rate limiting
            
        except Exception as e:
            errors += 1
            if "Duplicate" not in str(e):
                print(f"\n   [WARN] Error on {doc['source_id']}: {e}")
    
    print(f"\n[COMPLETE] Ingestion complete!")
    print(f"   Success: {success}")
    print(f"   Skipped: {skipped}")
    print(f"   Errors: {errors}")
    print(f"   Total in DB: {store.get_document_count()}")

def main():
    print("="*60)
    print("MariaDB Jira Fetcher & Vector Store Ingester")
    print("="*60)
    
    json_path = os.path.join(os.path.dirname(__file__), "..", "jira_optimizer_issues.json")
    
    # Step 1: Fetch from Jira
    print("\n[STEP 1] Fetching from Jira API...")
    issues = fetch_jira_issues()
    
    if not issues:
        print("[ERROR] No issues fetched. Exiting.")
        return
    
    # Step 2: Save to JSON (backup)
    print("\n[STEP 2] Saving to JSON...")
    save_issues_to_json(issues, json_path)
    
    # Step 3: Ingest to Vector Store
    print("\n[STEP 3] Ingesting to Vector Store...")
    ingest_to_vector_store(issues)
    
    print("\n" + "="*60)
    print("[SUCCESS] All done!")
    print("="*60)

if __name__ == "__main__":
    main()
