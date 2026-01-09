"""
LangChain Adapter for MariaDB Vector Search
"""
from typing import Any, List, Optional, Iterable, Tuple
from langchain_core.vectorstores import VectorStore
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
import mariadb
import json

from database import get_db_connection

class MariaDBEmbeddings(Embeddings):
    """Adapter for existing EmbeddingService to LangChain interface"""
    def __init__(self, service):
        self.service = service
        
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Mock embedding/service call
        if hasattr(self.service, "get_embeddings_batch"):
            return self.service.get_embeddings_batch(texts)
        return [[0.1] * 768] * len(texts)
        
    def embed_query(self, text: str) -> List[float]:
        if hasattr(self.service, "get_embedding"):
            return self.service.get_embedding(text)
        return [0.1] * 768

class MariaDBVectorStore(VectorStore):
    """MariaDB Vector Store integration for LangChain"""
    
    def __init__(
        self,
        embedding: Embeddings,
        connection_params: dict,
        table_name: str = "doc_embeddings",
        database: str = "finops_auditor"
    ):
        self.embedding = embedding
        self.connection_params = connection_params
        self.table_name = table_name
        self.database = database
        
    def _get_connection(self):
        # Use centralized connection factory (supports Mock/Offline)
        return get_db_connection(database=self.database)

    def add_texts(
        self,
        texts: Iterable[str],
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ) -> List[str]:
        """Run more texts through the embeddings and add to the vectorstore."""
        embeddings = self.embedding.embed_documents(list(texts))
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        ids = []
        for i, text in enumerate(texts):
            metadata = metadatas[i] if metadatas else {}
            source_type = metadata.get("source_type", "unknown")
            source_id = metadata.get("source_id", "unknown")
            
            # Use VEC_FromText for MariaDB Vector
            embedding_str = str(embeddings[i])
            
            cursor.execute(f"""
                INSERT INTO {self.table_name} (source_type, source_id, content, embedding)
                VALUES (?, ?, ?, VEC_FromText(?))
            """, (source_type, source_id, text, embedding_str))
            ids.append(str(cursor.lastrowid))
            
        conn.commit()
        conn.close()
        return ids

    def similarity_search(
        self, query: str, k: int = 4, **kwargs: Any
    ) -> List[Document]:
        """Return docs most similar to query."""
        embedding = self.embedding.embed_query(query)
        embedding_str = str(embedding)
        
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Simple Cosine Distance
        cursor.execute(f"""
            SELECT content, source_type, source_id, 
                   VEC_DISTANCE_COSINE(VEC_FromText(?), embedding) as distance
            FROM {self.table_name}
            ORDER BY distance ASC
            LIMIT ?
        """, (embedding_str, k))
        
        results = cursor.fetchall()
        conn.close()
        
        docs = []
        for row in results:
            metadata = {
                "source_type": row["source_type"],
                "source_id": row["source_id"],
                "distance": row["distance"]
            }
            docs.append(Document(page_content=row["content"], metadata=metadata))
            
        return docs

    @classmethod
    def from_texts(
        cls,
        texts: List[str],
        embedding: Embeddings,
        metadatas: Optional[List[dict]] = None,
        connection_params: dict = None,
        **kwargs: Any,
    ) -> "MariaDBVectorStore":
        """Return VectorStore initialized from texts and embeddings."""
        if not connection_params:
            raise ValueError("connection_params must be provided")
            
        store = cls(embedding, connection_params, **kwargs)
        store.add_texts(texts, metadatas)
        return store
