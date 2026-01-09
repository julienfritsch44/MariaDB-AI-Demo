"""
Use SkySQL API to enable slow query log and execute queries
"""

import httpx
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SKYSQL_API_KEY")
BASE_URL = "https://api.skysql.com"

async def enable_slow_log_via_api():
    """Enable slow query log using SkySQL API"""
    
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    print("=" * 60)
    print("  ENABLING SLOW QUERY LOG VIA SKYSQL API")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # 1. List services to get service ID
        print("\n[STEP 1] Getting service ID...")
        response = await client.get(
            f"{BASE_URL}/provisioning/v1/services",
            headers=headers,
            timeout=10.0
        )
        
        if response.status_code == 200:
            services = response.json()
            print(f"   OK Found {len(services)} service(s)")
            if services:
                service_id = services[0].get('id')
                service_name = services[0].get('name')
                print(f"   Service: {service_name} (ID: {service_id})")
                
                # 2. Try to update service configuration
                print("\n[STEP 2] Attempting to enable slow_query_log...")
                
                # Check API docs for correct endpoint
                print("   Checking available endpoints...")
                
                # Try configuration endpoint
                config_response = await client.get(
                    f"{BASE_URL}/provisioning/v1/services/{service_id}/configuration",
                    headers=headers,
                    timeout=10.0
                )
                
                print(f"   Configuration endpoint status: {config_response.status_code}")
                if config_response.status_code == 200:
                    print(f"   Response: {config_response.json()}")
        else:
            print(f"   ERROR: {response.status_code} - {response.text}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(enable_slow_log_via_api())
