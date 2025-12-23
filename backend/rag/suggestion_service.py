"""
AI Suggestion Service using SkyAI Copilot
Replaces Gemini for LLM-based query optimization suggestions
"""
import os
import json
import httpx
from typing import Optional


class SuggestionService:
    """
    AI-powered query optimization suggestions using SkyAI Copilot.
    """
    
    def __init__(self):
        self.api_key = os.getenv("SKYSQL_API_KEY")
        self.api_url = "https://api.skysql.com/copilot/v1/chat"
        
        if not self.api_key:
            print("[SuggestionService] WARNING: SKYSQL_API_KEY not set. AI suggestions will be limited.")
    
    def get_suggestion(self, context: str, query_fingerprint: str) -> dict:
        """
        Generate optimization suggestion based on context with source justifications.
        
        Args:
            context: Retrieved context from vector search (Jira tickets, docs)
            query_fingerprint: Normalized SQL query pattern
            
        Returns:
            Dictionary with suggestion details
        """
        prompt = f"""You are a MariaDB Senior DBA and High Performance Expert.
        
Analyze the following slow query fingerprint:
`{query_fingerprint}`

Use the following retrieved context (documentation & solved tickets):
{context}

Provide a structured response in JSON format with the following keys:
1. "query_explanation": A 1-2 sentence semantic explanation of what the query is doing.
2. "performance_assessment": A brief (2-3 sentences) assessment of WHY it is slow, citing specific MariaDB-specific issues if relevant.
3. "actionable_insights": A brief (2-3 sentences) set of actionable optimization suggestions.
4. "sql_fix": A single-line SQL command (e.g. CREATE INDEX, OPTIMIZE TABLE) if a direct fix is possible. Null otherwise.
5. "suggestion_type": One of ["INDEX", "REWRITE", "CONFIG"].
6. "confidence": A float between 0 and 1.
7. "confidence_breakdown": A brief explanation of WHY you chose this confidence level.
8. "risks": A brief list (1-3 items) of what could go wrong if the suggested fix is applied.
9. "source_justifications": A dictionary mapping source names to a 1-sentence explanation of WHY it is relevant.

Return ONLY valid JSON, no markdown."""

        # Try SkyAI Copilot
        if self.api_key:
            try:
                return self._call_skyai(prompt)
            except Exception as e:
                print(f"[SuggestionService] SkyAI failed: {e}")
        
        # Fallback to heuristic-based suggestion
        return self._heuristic_suggestion(query_fingerprint)
    
    def _call_skyai(self, prompt: str) -> dict:
        """Call SkyAI Copilot API synchronously"""
        import requests
        
        response = requests.post(
            self.api_url,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key
            },
            json={"prompt": prompt},
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"SkyAI returned {response.status_code}: {response.text}")
        
        result = response.json()
        answer = result.get("answer", "{}")
        
        # Parse JSON from response
        try:
            # Handle markdown-wrapped JSON
            if "```json" in answer:
                answer = answer.split("```json")[1].split("```")[0].strip()
            elif "```" in answer:
                answer = answer.split("```")[1].split("```")[0].strip()
            
            return json.loads(answer)
        except json.JSONDecodeError:
            # If not valid JSON, create structured response from text
            return {
                "query_explanation": answer[:200] if answer else "Unable to parse response.",
                "performance_assessment": "See explanation above.",
                "actionable_insights": "Review the query structure.",
                "sql_fix": None,
                "suggestion_type": "REWRITE",
                "confidence": 0.5,
                "confidence_breakdown": "Response was not in expected JSON format.",
                "risks": ["Manual review recommended"],
                "source_justifications": {}
            }
    
    def _heuristic_suggestion(self, fingerprint: str) -> dict:
        """Fallback heuristic-based suggestion when no AI is available"""
        sql_upper = fingerprint.upper()
        
        suggestion_type = "REWRITE"
        sql_fix = None
        confidence = 0.6
        risks = ["This is a heuristic suggestion - manual review recommended"]
        
        if "SELECT *" in sql_upper and "WHERE" not in sql_upper:
            query_explanation = "This query selects all columns without filtering."
            performance_assessment = "Full table scan is likely. No WHERE clause means every row is examined."
            actionable_insights = "Add a WHERE clause to filter results. Consider selecting only needed columns."
            sql_fix = None
            
        elif "IN (SELECT" in sql_upper:
            query_explanation = "This query uses a subquery in the IN clause."
            performance_assessment = "Subqueries in IN clauses can be slow due to repeated execution."
            actionable_insights = "Consider rewriting as a JOIN for better performance."
            suggestion_type = "REWRITE"
            
        elif "LIKE '%" in sql_upper:
            query_explanation = "This query uses a leading wildcard in LIKE."
            performance_assessment = "Leading wildcards prevent index usage, causing full scans."
            actionable_insights = "Consider using full-text search or restructuring the query."
            suggestion_type = "REWRITE"
            
        else:
            query_explanation = "Query pattern requires analysis."
            performance_assessment = "Unable to determine specific issues without AI analysis."
            actionable_insights = "Consider adding indexes on columns in WHERE and JOIN clauses."
            suggestion_type = "INDEX"
        
        return {
            "query_explanation": query_explanation,
            "performance_assessment": performance_assessment,
            "actionable_insights": actionable_insights,
            "sql_fix": sql_fix,
            "suggestion_type": suggestion_type,
            "confidence": confidence,
            "confidence_breakdown": "Heuristic analysis (AI service unavailable)",
            "risks": risks,
            "source_justifications": {}
        }
