
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

try:
    print("Importing deps...")
    import deps
    print("Deps imported. Initializing RAG...")
    deps.init_rag_services()
    print("RAG initialized.")

    from models import RewriteRequest

    async def test():
        print("Testing rewrite_query...")
        req = RewriteRequest(sql="SELECT * FROM orders WHERE id = 1")
        try:
            res = await deps.rewriter_service.rewrite_query(req)
            print("Success:", res)
        except Exception as e:
            print("Error during rewrite:", e)
            import traceback
            traceback.print_exc()

    if __name__ == "__main__":
        asyncio.run(test())

except Exception as e:
    print("Import/Init failed:", e)
    import traceback
    traceback.print_exc()
