"""
Test script for SkySQL Observability API
Tests if we can fetch slow query logs from the API
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Load .env FIRST before importing our service
load_dotenv()

# Add parent directory to path to import our service
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.skysql_observability import observability_service

async def test_observability_api():
    """Test the SkySQL Observability API"""
    
    print("=" * 60)
    print("  TESTING SKYSQL OBSERVABILITY API")
    print("=" * 60)
    
    # Check configuration
    api_key = os.getenv("SKYSQL_API_KEY")
    server_id = os.getenv("SKYSQL_SERVER_ID")
    
    print(f"\n[CONFIG] Configuration:")
    print(f"   API Key: {'OK Set' if api_key else 'X Missing'}")
    print(f"   Server ID: {server_id if server_id else 'Not set (will auto-detect)'}")
    
    if not api_key:
        print("\n[ERROR] SKYSQL_API_KEY not found in .env")
        return
    
    # Test 1: Get available log types
    print("\n[TEST 1] Fetching available log types...")
    log_types = await observability_service.get_log_types()
    if log_types:
        print(f"   OK Found log types: {log_types}")
    else:
        print("   WARNING No log types returned (API might not support this endpoint)")
    
    # Test 2: Fetch slow query logs
    print("\n[TEST 2] Fetching slow query logs (last 24 hours)...")
    logs = await observability_service.get_slow_query_logs(hours_back=24, limit=10)
    
    if logs:
        print(f"   OK Found {len(logs)} slow query logs")
        print(f"\n[SAMPLE] Sample log entry:")
        sample = logs[0]
        for key, value in sample.items():
            print(f"     {key}: {str(value)[:100]}")
        
        # Try to parse it
        print(f"\n[PARSE] Parsing log entry...")
        parsed = observability_service.parse_slow_query_log(sample)
        if parsed:
            print(f"   OK Successfully parsed:")
            print(f"     Query Time: {parsed['query_time']}s")
            print(f"     Rows Examined: {parsed['rows_examined']}")
            print(f"     SQL: {parsed['sql_text'][:100]}...")
        else:
            print(f"   WARNING Failed to parse log entry")
    else:
        print("   WARNING No slow query logs found")
        print("   This could mean:")
        print("     - No slow queries in the last 24 hours")
        print("     - Slow query logging not enabled on SkySQL")
        print("     - API endpoint name is different")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(test_observability_api())
