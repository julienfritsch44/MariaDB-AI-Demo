"""
MariaDB Vector Store Handler
"""
import mariadb
from typing import List, Dict, Any
from error_factory import ErrorFactory

class VectorStore:
    def __init__(self, connection_params: Dict[str, Any]):
        self.params = connection_params
        
    def get_connection(self, database: str = None):
        from database import get_db_connection
        return get_db_connection(database=database)
        
    def init_schema(self):
        """Create vector table if not exists"""
        try:
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
        except Exception as e:
            db_error = ErrorFactory.database_error(
                "Vector Store Schema Init",
                "Failed to initialize vector database and table",
                original_error=e
            )
            print(f"[VectorStore] {db_error}")
            raise db_error
        
    def add_document(self, source_type: str, source_id: str, content: str, embedding: List[float]):
        """Add a document and its embedding to the store"""
        try:
            conn = self.get_connection(database="finops_auditor")
            cursor = conn.cursor()
            
            # Format embedding as string representation for SQL
            embedding_str = str(embedding)
            
            cursor.execute("""
                INSERT INTO doc_embeddings (source_type, source_id, content, embedding)
                VALUES (?, ?, ?, VEC_FromText(?))
            """, (source_type, source_id, content, embedding_str))
            
            conn.commit()
            conn.close()
        except Exception as e:
            db_error = ErrorFactory.database_error(
                "Vector Store Add Document",
                f"Failed to add document {source_id} to vector store",
                original_error=e
            )
            print(f"[VectorStore] {db_error}")
            raise db_error
        
    def search_similar(self, query_embedding: List[float], limit: int = 3, threshold: float = 0.5) -> List[Dict[str, Any]]:
        """Search for similar content using Cosine Similarity"""
        import time
        start_t = time.time()
        try:
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
            elapsed = (time.time() - start_t) * 1000
            print(f"[PERF] Vector search (MariaDB) took {elapsed:.2f}ms for {len(results)} results")
            return results
        except Exception as e:
            db_error = ErrorFactory.database_error(
                "Vector Store Similarity Search",
                "Failed to search for similar documents in MariaDB",
                original_error=e
            )
            print(f"[VectorStore] {db_error}")
            return []

    def get_document_count(self) -> int:
        """Get the total number of documents in the vector store"""
        try:
            conn = self.get_connection(database="finops_auditor")
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM doc_embeddings")
            count = cursor.fetchone()[0]
            conn.close()
            # Ensure count is always an integer (MariaDB may return string in some configs)
            count = int(count) if count is not None else 0
            print(f"[VectorStore] Total document count: {count}")
            return count
        except Exception as e:
            db_error = ErrorFactory.database_error(
                "Vector Store Count",
                "Failed to get total document count",
                original_error=e
            )
            print(f"[VectorStore] {db_error}")
            return 0

    def get_document_counts_by_type(self) -> dict:
        """Get document counts grouped by source_type"""
        try:
            conn = self.get_connection(database="finops_auditor")
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT source_type, COUNT(*) as count 
                FROM doc_embeddings 
                GROUP BY source_type
            """)
            results = cursor.fetchall()
            conn.close()
            # Ensure counts are integers
            counts = {row['source_type']: int(row['count']) if row['count'] is not None else 0 for row in results}
            print(f"[VectorStore] Document counts by type: {counts}")
            return counts
        except Exception as e:
            db_error = ErrorFactory.database_error(
                "Vector Store Count by Type",
                "Failed to get document counts by type",
                original_error=e
            )
            print(f"[VectorStore] {db_error}")
            return {}
