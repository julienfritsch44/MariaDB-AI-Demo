"""
Gemini Service Handler
"""
import os
import google.generativeai as genai
from typing import List

class GeminiService:
    def __init__(self):
        # Support both variable names
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            print("WARNING: GOOGLE_API_KEY or GEMINI_API_KEY not found in environment variables. RAG will not work.")
        else:
            genai.configure(api_key=api_key)
            
        self.embedding_model = "models/text-embedding-004"
        self.chat_model = "gemini-2.0-flash-exp" 

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding for a given text"""
        if not text:
            return []
        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=384
            )
            return result['embedding']
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []

    def get_suggestion(self, context: str, query_fingerprint: str) -> dict:
        """Generate optimization suggestion based on context with source justifications"""
        prompt = f"""
        You are a MariaDB Senior DBA and High Performance Expert.
        
        Analyze the following slow query fingerprint:
        `{query_fingerprint}`
        
        Use the following retrieved context (documentation & solved tickets):
        {context}
        
        Provide a structured response in JSON format with the following keys:
        1. "query_explanation": A 1-2 sentence semantic explanation of what the query is doing.
        2. "performance_assessment": A brief (2-3 sentences) assessment of WHY it is slow, citing specific MariaDB-specific issues if relevant (e.g. optimizer cost model quirks from MDEVs in context).
        3. "actionable_insights": A brief (2-3 sentences) set of actionable optimization suggestions.
        4. "sql_fix": A single-line SQL command (e.g. CREATE INDEX, OPTIMIZE TABLE) if a direct fix is possible. Null otherwise.
        5. "suggestion_type": One of ["INDEX", "REWRITE", "CONFIG"].
        6. "confidence": A float between 0 and 1.
        7. "confidence_breakdown": A brief explanation (1-2 sentences) of WHY you chose this confidence level. Example: "80% because the query pattern matches MDEV-XXXX but table statistics are unknown."
        8. "risks": A brief list (1-3 items) of what could go wrong if the suggested fix is applied. Example: ["Index may increase write latency on high-insert tables", "Requires table lock during creation on older versions"].
        9. "source_justifications": A dictionary mapping source names (e.g. "jira:MDEV-XXXX") to a 1-sentence explanation of WHY it is relevant.
        
        IMPORTANT RULES FOR source_justifications:
        - ONLY include sources that are ACTUALLY relevant to the query problem.
        - If a Jira ticket or documentation does NOT help explain or fix this specific query, DO NOT include it.
        - Quality over quantity: 1 highly relevant source is better than 3 unrelated ones.
        - Never say "unrelated" - if it's unrelated, simply don't include it.
        
        Keep your tone professional, concise, and focused on FinOps impact.
        CRITICAL: Return ONLY valid JSON.
        """
        
        try:
            print(f"[GeminiService] Generating suggestion for fingerprint: {query_fingerprint[:50]}...")
            print(f"[GeminiService] Context length: {len(context)} chars")
            
            model = genai.GenerativeModel(
                self.chat_model,
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt)
            
            # Robust JSON parsing
            import json
            text = response.text.strip()
            print(f"[GeminiService] Raw response (first 200 chars): {text[:200]}...")
            
            if text.startswith("```json"):
                text = text.split("```json")[1].split("```")[0].strip()
            elif text.startswith("```"):
                text = text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(text)
            print(f"[GeminiService] Parsed JSON keys: {list(result.keys())}")
            return result
        except Exception as e:
            print(f"[GeminiService] ERROR generating or parsing structured suggestion: {e}")
            return {
                "query_explanation": "Unable to analyze query - AI service error occurred.",
                "performance_assessment": f"Error: {str(e)[:100]}",
                "actionable_insights": "Please try again or check backend logs.",
                "suggestion_text": "Unable to generate suggestion due to LLM error or parsing failure.",
                "sql_fix": None,
                "confidence": 0.0,
                "suggestion_type": "ERROR",
                "source_justifications": {}
            }
