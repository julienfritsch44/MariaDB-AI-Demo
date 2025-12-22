import os
import sys
from dotenv import load_dotenv

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from rag.gemini_service import GeminiService
from rag.vector_store import VectorStore

def test_rag():
    print("Testing RAG Engine...")
    
    # 1. Init
    try:
        service = GeminiService()
        print("GeminiService initialized.")
    except Exception as e:
        print(f"FAILED to init GeminiService: {e}")
        return

    # 2. VectorStore Init
    try:
        vs = VectorStore({
            "host": os.getenv("SKYSQL_HOST"),
            "port": int(os.getenv("SKYSQL_PORT", 3306)),
            "user": os.getenv("SKYSQL_USERNAME"),
            "password": os.getenv("SKYSQL_PASSWORD"),
            "ssl": True
        })
        print("VectorStore initialized.")
        vs.init_schema()
        print("Schema initialized (or already exists).")
        count = vs.get_document_count()
        print(f"Document count in KB: {count}")
    except Exception as e:
        print(f"FAILED to test VectorStore: {e}")

    # 3. Test Suggestion logic
    context = "- [jira] MDEV-38164: MariaDB 11.8.1 crash on explain plan."
    fingerprint = "EXPLAIN SELECT * FROM t1 WHERE id = ?"
    
    print(f"Querying Gemini with context: {context}")
    try:
        result = service.get_suggestion(context, fingerprint)
        print("RESULT:")
        print(result)
        
        if not isinstance(result, dict):
            print(f"ERROR: Result is not a dict, it is {type(result)}")
        elif "suggestion_text" not in result:
            print("ERROR: suggestion_text missing in result")
        else:
            print("Success!")
            
    except Exception as e:
        print(f"CRASH during suggestion: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_rag()
