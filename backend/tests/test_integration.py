
import pytest
import os
import sys
import mariadb

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection
from main import app
from fastapi.testclient import TestClient
from services.rewriter import QueryRewriterService

# We use the real app/client, but we might want to ensure we don't mock the service for this specific test
# or we just instantiate the service directly to test the Execute method against real DB.

@pytest.mark.asyncio
async def test_real_db_connection():
    """Verify we can actually connect to the Cloud DB"""
    try:
        conn = get_db_connection()
        assert conn is not None
        conn.close()
    except Exception as e:
        pytest.fail(f"Could not connect to real DB: {e}")

@pytest.mark.asyncio
async def test_execute_fix_integration():
    """
    Integration Test:
    1. Create a dummy request to create an index.
    2. Execute it via the service.
    3. Verify the index exists in the DB.
    4. Clean up (drop the index).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    db_name = "shop_demo"
    test_table = "test_integration_table"
    test_index_name = "idx_integration_test_created"
    
    # Setup: Ensure DB and Table exist
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")
        cursor.execute(f"CREATE TABLE IF NOT EXISTS {test_table} (id INT PRIMARY KEY, val INT)")
        conn.commit()
    except Exception as e:
        pytest.skip(f"Could not setup test table: {e}")
    finally:
        conn.close()

    service = QueryRewriterService(None, None, False) 
    
    create_sql = f"CREATE INDEX {test_index_name} ON {test_table}(val)"
    
    class MockRequest:
        sql = create_sql
        database = db_name

    # 2. Execute Fix
    print(f"\n[Integration] Executing: {create_sql}")
    try:
        result = await service.execute_fix(MockRequest())
    except Exception as e:
        pytest.fail(f"Execution failed: {e}")

    assert result["success"] is True, f"Service returned failure: {result}"

    # 3. Verify in DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"USE {db_name}")
    
    cursor.execute(f"""
        SELECT COUNT(*) FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = '{db_name}' 
        AND TABLE_NAME = '{test_table}' 
        AND INDEX_NAME = '{test_index_name}'
    """)
    count = cursor.fetchone()[0]
    
    exists = count > 0
    print(f"[Integration] Index {test_index_name} exists: {exists}")
    
    # 4. Cleanup
    try:
        cursor.execute(f"DROP TABLE IF EXISTS {test_table}")
        conn.commit()
    except Exception as e:
        print(f"Cleanup failed: {e}")
    finally:
        conn.close()

    assert exists is True, "The index was not created in the database!"
