import time
from typing import List, Optional, Dict, Any
import logging

from models import PredictRequest, PredictResponse, SimilarIssue
from parser.query_parser import SlowQueryParser

logger = logging.getLogger("uvicorn")

class PredictionService:
    def __init__(self, embedding_service, vector_store, rag_enabled: bool):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.rag_enabled = rag_enabled
        self.parser = SlowQueryParser()

    async def predict_query_risk(self, request: PredictRequest) -> PredictResponse:
        """
        🔮 Query Risk Predictor - Predict query risk BEFORE execution!
        
        Uses RAG to find similar issues from Jira knowledge base and AI to
        analyze potential problems, deadlocks, and performance issues.
        """
        if not self.rag_enabled or not self.embedding_service or not self.vector_store:
            return PredictResponse(
                risk_level="UNKNOWN",
                risk_score=0,
                reason="RAG Service unavailable. Please check backend configuration.",
                similar_issues=[],
                suggested_fix=None,
                query_analysis=None
            )
        
        start_total = time.time()
        sql = request.sql.strip()
        if not sql:
            return PredictResponse(
                risk_level="LOW",
                risk_score=0,
                reason="Empty query submitted.",
                similar_issues=[],
                suggested_fix=None,
                query_analysis=None
            )
        
        # 1. Normalize query to fingerprint
        fingerprint = self.parser.normalize_query(sql)
        print(f"[/predict] Analyzing query: {sql[:100]}...")
        print(f"[/predict] Fingerprint: {fingerprint[:80]}...")
        
        # 2. Search for similar issues in Jira knowledge base
        try:
            query_embedding = self.embedding_service.get_embedding(fingerprint)
            raw_similar_docs = self.vector_store.search_similar(query_embedding, limit=10, threshold=0.7)
            
            # Deduplicate results by base source_id (e.g., MDEV-37723#fragment -> MDEV-37723)
            seen_base_ids = set()
            similar_docs = []
            for doc in raw_similar_docs:
                source_id = doc.get('source_id', 'unknown')
                base_id = source_id.split('#')[0]
                if base_id not in seen_base_ids:
                    seen_base_ids.add(base_id)
                    similar_docs.append(doc)
                if len(similar_docs) >= 3:
                    break
                    
            print(f"[/predict] Found {len(similar_docs)} unique tickets (after base ID dedup)")
            
        except Exception as e:
            print(f"[/predict] Vector search failed: {e}")
            similar_docs = []
        
        # 3. Build context from similar issues
        similar_issues = []
        context_parts = []
        
        for doc in similar_docs:
            source_id = doc.get('source_id', 'unknown')
            content = doc.get('content', '')[:500]
            distance = doc.get('distance', 1.0)
            similarity = round((1 - distance) * 100, 1)  # Convert distance to similarity %
            
            # Extract title from content (first line or first 50 chars)
            title = content.split('\n')[0][:80] if content else source_id
            
            similar_issues.append(SimilarIssue(
                id=source_id,
                title=title,
                similarity=similarity,
                summary=content[:200] + "..." if len(content) > 200 else content
            ))
            
            context_parts.append(f"[{source_id}] (relevance: {similarity}%)\n{content}")
        
        context = "\n\n".join(context_parts) if context_parts else "No similar issues found in knowledge base."
        
        # 4. Risk Assessment - Heuristic-based analysis
        # (No external AI dependency - uses pattern matching and similar issues)
        sql_upper = sql.upper()
        risk_score = 30
        risk_level = "LOW"
        reason = "Query pattern analysis"
        query_analysis = "Analyzed query structure for common performance issues."
        suggested_fix = None
        
        # Check for risky patterns
        if "SELECT *" in sql_upper and "WHERE" not in sql_upper:
            risk_score = 85
            risk_level = "HIGH"
            reason = "SELECT * without WHERE clause - likely full table scan"
            query_analysis = "Full table scan detected. No filtering will cause all rows to be examined."
            suggested_fix = "Add a WHERE clause to filter results, or specify only needed columns."
        elif "LIKE '%" in sql_upper or 'LIKE "%' in sql_upper:
            risk_score = 70
            risk_level = "MEDIUM"
            reason = "Leading wildcard in LIKE - cannot use index"
            query_analysis = "Leading wildcard patterns prevent index usage, causing full scans."
        elif "IN (SELECT" in sql_upper:
            risk_score = 60
            risk_level = "MEDIUM"
            reason = "Subquery in IN clause - may cause performance issues"
            query_analysis = "Subqueries in IN clauses can be inefficient. Consider rewriting as JOIN."
        elif "CROSS JOIN" in sql_upper or ", " in sql_upper and "WHERE" not in sql_upper:
            risk_score = 80
            risk_level = "HIGH"
            reason = "Potential cartesian product - no join condition detected"
            query_analysis = "Missing join conditions can create cartesian products with massive row counts."
        elif similar_issues:
            risk_score = 55
            risk_level = "MEDIUM"
            reason = f"Pattern similar to known issues: {similar_issues[0].id}"
            query_analysis = f"Query pattern matches historical issue {similar_issues[0].id}."
        else:
            # Check for positive patterns
            if "WHERE" in sql_upper and "=" in sql_upper:
                risk_score = 25
                query_analysis = "Query has filtering conditions. Check that indexed columns are used."
            if "LIMIT" in sql_upper:
                risk_score = max(10, risk_score - 10)
                query_analysis += " LIMIT clause present - reduces result set size."
        
        print(f"[/predict] Heuristic analysis complete: {risk_level} ({risk_score})")
        
        elapsed_total = (time.time() - start_total) * 1000
        print(f"[PERF] Total /predict processing took {elapsed_total:.2f}ms")
    
        return PredictResponse(
            risk_level=risk_level,
            risk_score=risk_score,
            reason=reason,
            similar_issues=similar_issues,
            suggested_fix=suggested_fix,
            query_analysis=query_analysis
        )
