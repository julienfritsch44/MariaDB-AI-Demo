import pytest
from unittest.mock import MagicMock, AsyncMock
from services.prediction import PredictionService
from models import PredictRequest

@pytest.mark.asyncio
async def test_predict_rag_disabled():
    # Test that service returns safe default when RAG is disabled
    service = PredictionService(None, None, False)
    req = PredictRequest(sql="SELECT * FROM test")
    
    # Even if RAG is disabled, heuristics should run? 
    # Looking at the code: "if not self.rag_enabled ... return PredictResponse(risk_level='UNKNOWN' ...)"
    # Ah, the code implemented in Step 1839 returns UNKNOWN if RAG is unavailable.
    # Let's verify that behavior.
    
    res = await service.predict_query_risk(req)
    assert res.risk_level == "UNKNOWN"
    assert "unavailable" in res.reason

@pytest.mark.asyncio
async def test_predict_heuristic_select_star():
    # To test heuristics, we need RAG enabled but we can mock dependencies to return empty results
    mock_embedding = MagicMock()
    mock_vector_store = MagicMock()
    mock_vector_store.search_similar.return_value = [] # No similar issues
    
    service = PredictionService(mock_embedding, mock_vector_store, True)
    req = PredictRequest(sql="SELECT * FROM orders")
    
    res = await service.predict_query_risk(req)
    
    # Should detect SELECT * without WHERE
    assert res.risk_level == "HIGH"
    assert res.risk_score >= 80
    assert "SELECT *" in res.reason

@pytest.mark.asyncio
async def test_predict_heuristic_good_query():
    mock_embedding = MagicMock()
    mock_vector_store = MagicMock()
    mock_vector_store.search_similar.return_value = []
    
    service = PredictionService(mock_embedding, mock_vector_store, True)
    req = PredictRequest(sql="SELECT id, amount FROM orders WHERE status = 'pending' LIMIT 10")
    
    res = await service.predict_query_risk(req)
    
    assert res.risk_level == "LOW"
    assert res.risk_score < 50
    assert "LIMIT" in res.query_analysis
