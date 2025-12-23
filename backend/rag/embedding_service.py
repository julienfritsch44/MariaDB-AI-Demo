"""
Local Embedding Service using Sentence Transformers
Replaces Google Gemini API for vector embeddings
"""
from typing import List
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """
    Local embedding service using Sentence Transformers.
    
    Model: all-MiniLM-L6-v2
    - 384 dimensions (compatible with existing MariaDB VECTOR schema)
    - Fast, accurate, and completely free/local
    - No API key required
    """
    
    _instance = None
    _model = None
    
    def __new__(cls, model_name: str = "all-MiniLM-L6-v2"):
        """Singleton pattern to avoid loading model multiple times"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if EmbeddingService._model is None:
            print(f"[EmbeddingService] Loading model '{model_name}'...")
            EmbeddingService._model = SentenceTransformer(model_name)
            print(f"[EmbeddingService] Model loaded successfully!")
        self.model = EmbeddingService._model
        self.dimension = 384
        self.model_name = model_name
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats (384 dimensions)
        """
        if not text or not text.strip():
            return []
        
        try:
            # Normalize embeddings for cosine similarity
            embedding = self.model.encode(
                text, 
                normalize_embeddings=True,
                show_progress_bar=False
            )
            return embedding.tolist()
        except Exception as e:
            print(f"[EmbeddingService] Error generating embedding: {e}")
            return []
    
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (more efficient than one-by-one).
        
        Args:
            texts: List of input texts
            
        Returns:
            List of embeddings (each 384 dimensions)
        """
        if not texts:
            return []
        
        # Filter empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return []
        
        try:
            embeddings = self.model.encode(
                valid_texts,
                normalize_embeddings=True,
                show_progress_bar=len(valid_texts) > 10,
                batch_size=32
            )
            return [e.tolist() for e in embeddings]
        except Exception as e:
            print(f"[EmbeddingService] Error generating batch embeddings: {e}")
            return []
    
    def get_info(self) -> dict:
        """Return information about the embedding service"""
        return {
            "model": self.model_name,
            "dimension": self.dimension,
            "type": "local",
            "provider": "sentence-transformers"
        }
