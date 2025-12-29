
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SKYSQL_API_KEY")
HOST = os.getenv("SKYSQL_HOST")

def check_skysql_api():
    if not API_KEY:
        print("❌ SKYSQL_API_KEY not found")
        return

    print("--- Testing SkySQL API ---")
    headers = {
        "X-API-Key": API_KEY, # Try X-API-Key header (used in POC3)
        "Content-Type": "application/json"
    }
    
    # Try Authorization Bearer as well just in case, or check docs if search was allowed
    # But usually SkySQL uses X-API-Key or Bearer token. POC3 used X-API-Key.
    
    # 1. List Services to find ID
    print("\n1. Listing Services...")
    try:
        # Common SkySQL API endpoint for provisioning
        resp = requests.get("https://api.skysql.com/provisioning/v1/services", headers=headers)
        
        if resp.status_code == 200:
            services = resp.json()
            print(f"✅ Found {len(services)} services")
            
            target_service = None
            for s in services:
                # Try to match host
                fqdn = s.get('fqdn') or s.get('dns_name') or ''
                sid = s.get('id')
                name = s.get('name')
                print(f"   - [{sid}] {name} ({fqdn})")
                
                if HOST and (HOST in fqdn or fqdn in HOST):
                    target_service = s
            
            if target_service:
                sid = target_service['id']
                print(f"\n✅ Matched Service ID: {sid}")
                
                # 2. Try to fetch Observability Logs
                print(f"\n2. Fetching Slow Query Logs for {sid}...")
                # Note: Endpoint path is a guess based on standard REST patterns for SkySQL
                # Typically: /observability/v1/services/{id}/logs or similar
                
                # Let's try to get log listing first
                log_url = f"https://api.skysql.com/observability/v1/services/{sid}/logs"
                r_log = requests.get(log_url, headers=headers)
                
                print(f"Status: {r_log.status_code}")
                if r_log.status_code == 200:
                    print(json.dumps(r_log.json(), indent=2))
                else:
                    print(f"Response: {r_log.text}")
                    
            else:
                print("⚠️ Could not match current HOST to any service.")
                
        else:
            print(f"❌ Failed to list services: {resp.status_code} {resp.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_skysql_api()
