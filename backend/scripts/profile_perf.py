
import asyncio
import time
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

async def profile():
    import deps
    print("Initializing RAG...")
    deps.init_rag_services()
    
    from models import RewriteRequest
    
    print("\n--- Starting Profile ---")
    start_total = time.time()
    
    req = RewriteRequest(sql="SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE status = 'active')")
    
    # We will manually access the service to time components if possible, 
    # but calling the main method is easier to see "user experience".
    # To get granular breakdown, I'd need to modify the service or mock parts.
    # For now, let's just run the full service and see the logs (service has prints).
    
    print("Calling rewrite_query...")
    res = await deps.rewriter_service.rewrite_query(req)
    
    end_total = time.time()
    print(f"\n--- Profile Complete ---")
    print(f"Total Duration: {end_total - start_total:.4f}s")
    
    if res.simulation:
        print("Simulation Included: Yes")

if __name__ == "__main__":
    asyncio.run(profile())
