import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SKYSQL_API_KEY")
HOST = os.getenv("SKYSQL_HOST")

def test_api():
    print("=== SkySQL Observability API Test ===\n")
    
    if not API_KEY:
        print("ERROR: SKYSQL_API_KEY not found in .env")
        return
    
    print(f"API Key: {API_KEY[:8]}...")
    
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    # 1. List services to get the database ID
    print("\n1. Listing SkySQL Services...")
    try:
        resp = requests.get("https://api.skysql.com/provisioning/v1/services", headers=headers, timeout=30)
        print(f"   Status: {resp.status_code}")
        
        if resp.status_code == 200:
            services = resp.json()
            print(f"   Found {len(services)} service(s)")
            
            target_id = None
            for s in services:
                fqdn = s.get('fqdn', '')
                sid = s.get('id', '')
                name = s.get('name', '')
                print(f"   - [{sid}] {name} ({fqdn})")
                
                if HOST and HOST in fqdn:
                    target_id = sid
            
            if target_id:
                print(f"\n   Matched Service ID: {target_id}")
                
                # 2. Get available log types
                print("\n2. Checking available log types...")
                types_resp = requests.get("https://api.skysql.com/observability/v2/logs/types", headers=headers, timeout=30)
                print(f"   Status: {types_resp.status_code}")
                if types_resp.status_code == 200:
                    print(f"   Log Types: {types_resp.json()}")
                else:
                    print(f"   Response: {types_resp.text}")
                
                # 3. Query slow query logs
                print("\n3. Querying slow query logs...")
                now = datetime.utcnow()
                from_date = (now - timedelta(hours=24)).isoformat() + "Z"
                to_date = now.isoformat() + "Z"
                
                query_body = {
                    "fromDate": from_date,
                    "toDate": to_date,
                    "logType": ["slow-query-log"],
                    "serverContext": [target_id]
                }
                print(f"   Request: {query_body}")
                
                logs_resp = requests.post(
                    "https://api.skysql.com/observability/v2/logs/query",
                    headers=headers,
                    json=query_body,
                    timeout=30
                )
                print(f"   Status: {logs_resp.status_code}")
                if logs_resp.status_code == 200:
                    data = logs_resp.json()
                    print(f"   SUCCESS! Got {len(data) if isinstance(data, list) else 'some'} log entries")
                    # Print first few entries
                    if isinstance(data, list) and len(data) > 0:
                        for entry in data[:3]:
                            print(f"   Entry: {str(entry)[:200]}...")
                    else:
                        print(f"   Data: {str(data)[:500]}")
                else:
                    print(f"   Response: {logs_resp.text}")
            else:
                print("   Could not match HOST to any service.")
        else:
            print(f"   Error: {resp.text}")
            
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_api()
