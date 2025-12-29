
import os
import mariadb
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Mock Classes for Demo Mode
class MockCursor:
    def __init__(self):
        self.lastrowid = 1
        self.last_query = ""
    
    def execute(self, query, params=None):
        self.last_query = query.lower()
        print(f"[MOCK DB] Executing: {query[:50]}...")
        pass
        
    def fetchone(self):
        # Generic mock response usually for Version or Count
        return ["10.11.5-MariaDB-Mock"]
        
    def fetchall(self):
        # Mock Vector Search Results for LangChain
        if "doc_embeddings" in self.last_query:
            return [
                {
                    "content": "Ticket: MDEV-30820\nSummary: Optimizer fails to use index on large IN() clauses.\nResolution: Rewrite as JOIN or use materialize subquery.",
                    "source_type": "jira",
                    "source_id": "MDEV-30820",
                    "distance": 0.12
                },
                {
                    "content": "Ticket: MDEV-12832\nSummary: Slow query on orders table due to missing composite index.\nFix: ALTER TABLE orders ADD INDEX(customer_id, status);",
                    "source_type": "jira", 
                    "source_id": "MDEV-12832",
                    "distance": 0.15
                }
            ]
        return []

    def close(self):
        pass

class MockConnection:
    def cursor(self, dictionary=False):
        return MockCursor()
        
    def commit(self):
        pass
        
    def close(self):
        pass

def get_db_connection(database: str = None):
    """
    Get MariaDB connection from environment variables.
    Returns a mariadb.connection object or a MockConnection if failed.
    """
    try:
        if os.getenv("DEMO_MODE", "false").lower() == "true":
             raise Exception("Forcing Demo Mode")

        return mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 3306)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            database=database,
            ssl=True,
            connect_timeout=3
        )
    except Exception as e:
        print(f"\n{'='*50}")
        print(f"⚠️  DB CONNECTION FAILED (db={database}): {e}")
        print(f"⚠️  SWITCHING TO OFFLINE MOCK MODE for Demo")
        print(f"{'='*50}\n")
        return MockConnection()
