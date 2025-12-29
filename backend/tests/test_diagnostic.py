
import unittest
import sys
import os
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.diagnostic import DiagnosticService

class TestDiagnosticService(unittest.TestCase):
    def setUp(self):
        self.mock_embedding_service = MagicMock()
        self.mock_vector_store = MagicMock()
        self.service = DiagnosticService(
            embedding_service=self.mock_embedding_service, 
            vector_store=self.mock_vector_store
        )

    async def async_test_embeddings_online(self):
        # Setup
        self.mock_embedding_service.get_info.return_value = {"model": "test-model"}
        
        # Action
        result = await self.service.check_embeddings()
        
        # Assert
        self.assertEqual(result["status"], "online")
        self.assertEqual(result["info"]["model"], "test-model")

    async def async_test_jira_online(self):
        # Setup
        self.mock_vector_store.get_document_count.return_value = 100
        
        # Action
        result = await self.service.check_jira()
        
        # Assert
        self.assertEqual(result["status"], "online")
        self.assertEqual(result["document_count"], 100)

    def test_run_async(self):
        """Helper to run async tests from sync unittest"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.async_test_embeddings_online())
            loop.run_until_complete(self.async_test_jira_online())
        finally:
            loop.close()

if __name__ == '__main__':
    unittest.main()
