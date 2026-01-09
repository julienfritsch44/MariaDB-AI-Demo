import os
from parser.query_parser import SlowQueryParser
from scorer.impact_scorer import ImpactScorer
from rag.embedding_service import EmbeddingService
from rag.vector_store import VectorStore
from rag.suggestion_service import SuggestionService
from mcp_service import get_mcp_service, MCPService
from dotenv import load_dotenv

load_dotenv()

import logging
logger = logging.getLogger(__name__)

from services.prediction import PredictionService
from services.index import IndexSimulationService
from services.rewriter import QueryRewriterService

# Global Instances
parser = SlowQueryParser()
scorer = ImpactScorer()

# RAG Services
rag_enabled = os.getenv("RAG_ENABLED", "true").lower() == "true"
embedding_service = None
vector_store = None
suggestion_service = None
mcp_service = None

# Business Services
prediction_service = None
index_service = IndexSimulationService() # No deps needed for instantiation
rewriter_service = None


def init_rag_services():
    global rag_enabled, embedding_service, vector_store, suggestion_service, mcp_service, prediction_service, rewriter_service
    
    try:
        logger.info("[DEPS] Initializing Real RAG Services...")
        
        # Vector Store
        db_params = {
            "host": os.getenv("SKYSQL_HOST"),
            "port": int(os.getenv("SKYSQL_PORT", 3306)),
            "user": os.getenv("SKYSQL_USERNAME"),
            "password": os.getenv("SKYSQL_PASSWORD"),
            "ssl": True
        }
        vector_store = VectorStore(db_params)
        vector_store.init_schema()

        # Services
        embedding_service = EmbeddingService()
        suggestion_service = SuggestionService()
        mcp_service = get_mcp_service(vector_store, embedding_service)
        
        # Initialize Business Services with RAG dependencies
        prediction_service = PredictionService(embedding_service, vector_store, False) # Real mode
        rewriter_service = QueryRewriterService(embedding_service, vector_store, False, index_service)
        
        rag_enabled = True
        logger.info(f"RAG Services initialized successfully.")
        
    except Exception as e:
        logger.error(f"FATAL: RAG Services init failed: {e}")
        # Not setting rag_enabled = True here, let the system fail if RAG is required
        rag_enabled = False
        raise e
