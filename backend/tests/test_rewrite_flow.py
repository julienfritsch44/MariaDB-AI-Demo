
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.rewriter import QueryRewriterService

client = TestClient(app)

# Mock deps.rewriter_service to avoid real DB/AI calls
@pytest.fixture
def mock_rewriter_service():
    with patch("deps.rewriter_service") as mock:
        yield mock

def test_rewrite_endpoint_mocked(mock_rewriter_service):
    # Setup mock return as awaitable
    async def mock_rewrite(*args, **kwargs):
        return {
            "original_sql": "SELECT * FROM orders",
            "rewritten_sql": "SELECT id, date FROM orders",
            "improvements": ["Specified columns"],
            "estimated_speedup": "20%",
            "confidence": 0.8,
            "explanation": "Test explanation",
            "similar_jira_tickets": [],
            "anti_patterns_detected": ["SELECT *"]
        }
    mock_rewriter_service.rewrite_query.side_effect = mock_rewrite

    response = client.post("/rewrite", json={"sql": "SELECT * FROM orders"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["original_sql"] == "SELECT * FROM orders"
    assert data["rewritten_sql"] == "SELECT id, date FROM orders"
    # Verify service was called
    mock_rewriter_service.rewrite_query.assert_called_once()

def test_execute_fix_validation():
    # Test with unsafe command (SELECT)
    response = client.post("/execute-fix", json={"sql": "SELECT * FROM users"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Invalid command" in data["message"]

def test_execute_fix_mocked_success(mock_rewriter_service):
    # Setup mock return as awaitable
    async def mock_execute(*args, **kwargs):
        return {
            "success": True,
            "message": "Fix executed successfully"
        }
    mock_rewriter_service.execute_fix.side_effect = mock_execute

    # Test with safe command
    response = client.post("/execute-fix", json={"sql": "CREATE INDEX idx_test ON users(email)"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Fix executed successfully"
    # Verify service was called
    mock_rewriter_service.execute_fix.assert_called_once()
