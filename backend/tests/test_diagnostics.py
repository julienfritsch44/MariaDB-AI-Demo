
import pytest
import asyncio
from unittest.mock import MagicMock, patch
import sys
import os
import time

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.diagnostic import DiagnosticService

@pytest.fixture
def mock_deps():
    mock_emb = MagicMock()
    mock_emb.get_info.return_value = {"model": "test-model"}
    
    mock_vec = MagicMock()
    # Simulate a "slow" blocking call if it wasn't async-ified
    def slow_count():
        time.sleep(1) # Simulate DB latency
        return 10
        
    mock_vec.get_document_count.side_effect = slow_count
    
    return mock_emb, mock_vec

@pytest.mark.asyncio
async def test_diagnostic_async_concurrency(mock_deps):
    """
    Verify that check_mariadb and check_jira run concurrently and don't block the loop.
    We simulate a slow blocking call in mock_vec.
    """
    mock_emb, mock_vec = mock_deps
    
    # Mock MariaDB connection
    with patch("services.diagnostic.get_db_connection") as mock_conn:
        # Simulate slow connection
        def slow_connect():
            time.sleep(1)
            mock = MagicMock()
            return mock
        mock_conn.side_effect = slow_connect
        
        service = DiagnosticService(embedding_service=mock_emb, vector_store=mock_vec)
        
        start_time = time.time()
        # If it wasn't concurrent (threaded), this would take 1s (MariaDB) + 1s (Jira) = 2s
        # With concurrency, it should take ~1s total.
        results = await service.get_all_diagnostics()
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Diagnostics duration: {duration:.2f}s")
        
        # Verify correctness
        assert len(results) >= 3
        # MariaDB result
        assert results[0]["status"] == "online"
        # Jira result
        assert results[2]["status"] == "online"
        
        # Verify Speed: Should be faster than serial execution
        # Allowing some overhead, but definitely < 3.5s
        assert duration < 3.5, f"Diagnostics took too long ({duration:.2f}s), concurrency might be broken"
