
import pytest
import re
import sys
import os
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rewriter import QueryRewriterService

@pytest.mark.asyncio
async def test_heuristic_rewrite_multiline_in():
    # Properly mock dependencies
    mock_embedding = MagicMock()
    mock_vector_store = MagicMock()
    mock_index_service = MagicMock()
    
    service = QueryRewriterService(
        embedding_service=mock_embedding,
        vector_store=mock_vector_store,
        rag_enabled=False,
        index_service=mock_index_service
    )
    
    original_sql = """
    SELECT * FROM orders 
    WHERE customer_id IN (
        SELECT id FROM customers WHERE status = 'active'
    ) 
    AND total_amount > 1000
    """
    
    # We call the method. Since we didn't mock the AI, it will likely fall back to heuristics
    # if we provide the right context.
    
    # Manually trigger the heuristic for testing by mocking async helpes
    async def mock_call_skyai(sql, *args, **kwargs):
        return sql, None, []
    async def mock_search_jira(*args, **kwargs):
        return [], []
        
    service._call_skyai = mock_call_skyai
    service._search_similar_jira = mock_search_jira
    
    # We need to simulate the environment where anti-patterns are detected
    from models import RewriteRequest
    request = RewriteRequest(sql=original_sql)
    
    response = await service.rewrite_query(request)
    rewritten_sql = response.rewritten_sql
    explanation = response.explanation
    
    print(f"Original:\n{original_sql}")
    print(f"Rewritten:\n{rewritten_sql}")
    print(f"Explanation: {explanation}")
    
    assert "INNER JOIN customers" in rewritten_sql
    assert "ON customer_id = c2.id" in rewritten_sql
    assert "WHERE c2.status = 'active'" in rewritten_sql.upper()
    assert "AND total_amount > 1000" in rewritten_sql
    assert "IN (SELECT" not in rewritten_sql

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_heuristic_rewrite_multiline_in())
