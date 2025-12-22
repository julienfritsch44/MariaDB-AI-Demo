import requests
import os
import sys
import urllib.parse
from dotenv import load_dotenv

# Add paths for VectorStore and GeminiService
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
load_dotenv()

from rag.gemini_service import GeminiService
from rag.vector_store import VectorStore

def fetch_and_ingest_jira():
    print("Starting Massive Jira Ingestion (~100 tickets)...")
    
    # JQL to find interesting optimizer/performance tickets
    # Focus on Optimizer, Performance, InnoDB, and resolved issues
    jql = 'project = MDEV AND component = Optimizer AND resolution = Fixed ORDER BY created DESC'
    encoded_jql = urllib.parse.quote(jql)
    url = f"https://jira.mariadb.org/rest/api/2/search?jql={encoded_jql}&maxResults=100"
    
    try:
        print(f"Fetching tickets from MariaDB Jira (maxResults=100)...")
        response = requests.get(url, timeout=30)
        if response.status_code != 200:
            print(f"Jira API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return
            
        data = response.json()
        issues = data.get("issues", [])
        print(f"Found {len(issues)} candidate tickets.")
        
        # Init Services
        gemini = GeminiService()
        vs = VectorStore({
            "host": os.getenv("SKYSQL_HOST"),
            "port": int(os.getenv("SKYSQL_PORT", 3306)),
            "user": os.getenv("SKYSQL_USERNAME"),
            "password": os.getenv("SKYSQL_PASSWORD"),
            "ssl": True
        })
        vs.init_schema()

        count = 0
        for issue in issues:
            key = issue.get("key")
            fields = issue.get("fields", {})
            summary = fields.get("summary", "")
            description = fields.get("description", "") or ""
            
            # Combine summary and description for context
            content = f"Ticket: {key}\nSummary: {summary}\nDescription: {description[:1000]}" # Limit size per ticket
            
            print(f"Processing {key} ({count+1}/{len(issues)})...")
            
            try:
                # Get embeddings
                embedding = gemini.get_embedding(content)
                if not embedding:
                    print(f"Failed to get embedding for {key}, skipping.")
                    continue
                    
                # Store
                vs.add_document(
                    source_type="jira",
                    source_id=key,
                    content=content,
                    embedding=embedding
                )
                count += 1
            except Exception as e:
                print(f"Error processing {key}: {e}")

        print(f"Successfully ingested {count} tickets into the Vector Store.")
        
    except Exception as e:
        print(f"Massive Ingestion Failed: {e}")

if __name__ == "__main__":
    fetch_and_ingest_jira()
