import requests
import json
import time

def trigger_mcp_demo():
    print("🚀 Starting Real MCP Demo Trigger...")
    base_url = "http://localhost:8000/mcp"
    
    tools = [
        {
            "tool": "search_knowledge_base",
            "arguments": {"query": "Performance issue on large JOINs", "limit": 2}
        },
        {
            "tool": "analyze_query",
            "arguments": {"sql": "SELECT * FROM orders JOIN order_items ON orders.id = order_items.order_id WHERE total > 1000"}
        },
        {
            "tool": "get_schema",
            "arguments": {"database": "shop_demo", "table": "orders"}
        }
    ]
    
    for t in tools:
        print(f"📦 Calling MCP Tool: {t['tool']}...")
        try:
            resp = requests.post(f"{base_url}/execute", json=t)
            if resp.status_code == 200:
                print(f"✅ Success! Response recorded in Dashboard.")
            else:
                print(f"❌ Failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        time.sleep(2) # Wait to see it on dashboard

    print("\n✨ MCP Demo completed. Check the 'System Health' tab on your dashboard!")

if __name__ == "__main__":
    trigger_mcp_demo()
