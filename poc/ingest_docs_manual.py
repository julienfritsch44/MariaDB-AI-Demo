import os
import sys
from dotenv import load_dotenv

# Add paths
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
load_dotenv()

from rag.gemini_service import GeminiService
from rag.vector_store import VectorStore

def ingest_docs_manually():
    print("Ingesting MariaDB Documentation manually...")
    
    docs = [
        {
            "id": "https://mariadb.com/docs/server/server-management/server-monitoring-logs/slow-query-log/slow-query-log-overview#enabling",
            "content": "The slow query log is disabled by default. To enable it, set slow_query_log (or log_slow_query in 10.11+) to 1. Dynamically: SET GLOBAL slow_query_log=1; In option files: [mariadb] slow_query_log=1."
        },
        {
            "id": "https://mariadb.com/docs/server/server-management/server-monitoring-logs/slow-query-log/slow-query-log-overview#not-using-indexes",
            "content": "Log queries that don't use indexes by setting log_queries_not_using_indexes to 1. This identifies optimization opportunities even for fast queries. Use min_examined_row_limit to filter noise."
        },
        {
            "id": "https://mariadb.com/docs/server/server-management/server-monitoring-logs/slow-query-log/explain-in-the-slow-query-log#switching-it-on",
            "content": "EXPLAIN output in slow logs can be enabled by adding 'explain' to log_slow_verbosity. Example: [mysqld] log_slow_verbosity=query_plan,explain. Only works if log is written to a file."
        }
    ]
    
    gemini = GeminiService()
    vs = VectorStore({
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    })

    for doc in docs:
        print(f"Ingesting: {doc['id']}")
        embedding = gemini.get_embedding(doc['content'])
        vs.add_document("documentation", doc['id'], doc['content'], embedding)
        
    print("Manual ingestion complete!")

if __name__ == "__main__":
    ingest_docs_manually()
