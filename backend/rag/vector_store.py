"""
MariaDB Vector Store Handler
"""
import os
import mariadb
from typing import List, Dict, Any

class VectorStore:
    def __init__(self, connection_params: Dict[str, Any]):
        self.params = connection_params
        
    def get_connection(self, database: str = None):
        params = self.params.copy()
        if database:
            params["database"] = database
        return mariadb.connect(**params)
        
    def init_schema(self):
        """Create vector table if not exists"""
        # Connect without DB first to create it
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("CREATE DATABASE IF NOT EXISTS finops_auditor")
        conn.commit()
        conn.close()
        
        # Connect with DB
        conn = self.get_connection(database="finops_auditor")
        cursor = conn.cursor()
        
        # Table for storing embeddings (docs and jira tickets)
        # 384 dimensions for 'text-embedding-gecko' or 'all-MiniLM-L6-v2'
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doc_embeddings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_type VARCHAR(50), -- 'jira', 'documentation'
                source_id VARCHAR(255), -- Ticket ID or URL
                content TEXT,
                embedding VECTOR(384),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        
    def add_document(self, source_type: str, source_id: str, content: str, embedding: List[float]):
        """Add a document and its embedding to the store"""
        conn = self.get_connection(database="finops_auditor")
        cursor = conn.cursor()
        
        # Convert list to vector string format if needed, or pass as is depending on driver support
        # MariaDB Logic: VEC_FromText('[...]') or direct param if supported
        # Python driver 1.1+ supports passed as bytes or string. Let's use string representation.
        
        # Format embedding as string representation for SQL if direct binding has issues
        # But let's try direct binding first or VEC_FromText
        embedding_str = str(embedding)
        
        cursor.execute("""
            INSERT INTO doc_embeddings (source_type, source_id, content, embedding)
            VALUES (?, ?, ?, VEC_FromText(?))
        """, (source_type, source_id, content, embedding_str))
        
        conn.commit()
        conn.close()
        
    def search_similar(self, query_embedding: List[float], limit: int = 3, threshold: float = 0.5) -> List[Dict[str, Any]]:
        """Search for similar content using Cosine Similarity"""
        conn = self.get_connection(database="finops_auditor")
        cursor = conn.cursor(dictionary=True)
        
        embedding_str = str(query_embedding)
        
        cursor.execute("""
            SELECT 
                source_type, 
                source_id, 
                content, 
                VEC_DISTANCE_COSINE(VEC_FromText(?), embedding) as distance
            FROM doc_embeddings
            WHERE VEC_DISTANCE_COSINE(VEC_FromText(?), embedding) < ?
            ORDER BY distance ASC
            LIMIT ?
        """, (embedding_str, embedding_str, threshold, limit))
        
        results = cursor.fetchall()
        conn.close()
    def get_document_count(self) -> int:
        """Get the total number of documents in the vector store"""
        conn = self.get_connection(database="finops_auditor")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM doc_embeddings")
        count = cursor.fetchone()[0]
        conn.close()
        return count
