import os
import time
import re
import json
import asyncio
import httpx
from typing import List, Optional, Tuple

from models import RewriteRequest, RewriteResponse, SimilarJiraTicket, IndexSimulationResponse
from parser.query_parser import SlowQueryParser
from config import SKYAI_AGENT_ID

from services.index import IndexSimulationService
from services.cache import query_rewrite_cache

class QueryRewriterService:
    def __init__(self, embedding_service, vector_store, rag_enabled: bool, index_service: Optional[IndexSimulationService] = None):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.rag_enabled = rag_enabled
        self.index_service = index_service
        self.parser = SlowQueryParser()

    async def _search_similar_jira(self, sql: str) -> Tuple[List[SimilarJiraTicket], List[dict]]:
        """Async helper for RAG search - runs in parallel with other operations"""
        similar_jira_tickets = []
        similar_docs = []
        
        if not (self.rag_enabled and self.embedding_service and self.vector_store):
            return similar_jira_tickets, similar_docs
            
        try:
            rag_start = time.time()
            fingerprint = self.parser.normalize_query(sql)
            query_embedding = self.embedding_service.get_embedding(fingerprint)
            
            loop = asyncio.get_running_loop()
            raw_similar_docs = await loop.run_in_executor(
                None, 
                lambda: self.vector_store.search_similar(query_embedding, limit=10, threshold=0.8)
            )
            
            # Deduplicate results by base source_id
            seen_base_ids = set()
            for doc in raw_similar_docs:
                source_id = doc.get('source_id', 'unknown')
                base_id = source_id.split('#')[0]
                if base_id not in seen_base_ids:
                    seen_base_ids.add(base_id)
                    similar_docs.append(doc)
                if len(similar_docs) >= 3:
                    break

            for doc in similar_docs:
                source_id = doc.get('source_id', 'unknown')
                content = doc.get('content', '')[:100]
                distance = doc.get('distance', 1.0)
                similarity = round((1 - distance) * 100, 1)
                
                similar_jira_tickets.append(SimilarJiraTicket(
                    id=source_id,
                    title=content.split('\n')[0][:80] if content else source_id,
                    similarity=similarity
                ))
            
            print(f"[PERF] RAG search took {(time.time() - rag_start) * 1000:.2f}ms")
        except Exception as e:
            print(f"[/rewrite] RAG search failed: {e}")
        
        return similar_jira_tickets, similar_docs

    async def _call_skyai(self, sql: str, anti_patterns: List[str], similar_jira_tickets: List[SimilarJiraTicket], similar_docs: List[dict]) -> Tuple[str, Optional[str], dict]:
        """Async helper for SkyAI API call"""
        skysql_api_key = os.getenv("SKYSQL_API_KEY")
        
        if not skysql_api_key or not anti_patterns:
            return sql, None, {}
        
        # Build context-aware prompt (trimmed for speed)
        jira_context = chr(10).join([
            f"- {t.id} (Content: {next((d['content'] for d in similar_docs if d['source_id'] == t.id), '')[:300]})" 
            for t in similar_jira_tickets[:2]  # Limit to 2 tickets for speed
        ])
        
        prompt = f"""Tu es un expert en optimisation SQL MariaDB/MySQL.

**QUERY ORIGINALE:**
```sql
{sql}
```

**ANTI-PATTERNS DÉTECTÉS:**
{chr(10).join(f"- {p}" for p in anti_patterns)}

**INSTRUCTIONS:**
1. Réécris cette query pour optimiser les performances
2. Corrige les anti-patterns détectés
3. Conserve la logique métier exacte (même résultat)
4. Utilise des JOINs au lieu de subqueries IN quand possible
5. **SUGGÈRE UN INDEX (DDL)** si nécessaire (ex: CREATE INDEX ...)

**JIRA CONTEXT:**
{jira_context if jira_context else "Aucun ticket trouvé."}

**RÉPONDS AU FORMAT JSON:**
{{"sql": "query réécrite", "suggested_ddl": "CREATE INDEX ... ou null", "jira_analysis": {{"MDEV-XXX": "BUG: ... | SOLUTION: ..."}}}}
Réponds UNIQUEMENT avec le JSON."""

        try:
            api_start = time.time()
            print(f"[/rewrite] Calling SkyAI Copilot API...")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.skysql.com/copilot/v1/chat/",
                    headers={
                        "Content-Type": "application/json",
                        "X-API-Key": skysql_api_key
                    },
                    json={"prompt": prompt, "agent_id": SKYAI_AGENT_ID},
                    timeout=15.0  # Reduced from 25s for faster response
                )
                
            api_elapsed = (time.time() - api_start) * 1000
            print(f"[PERF] SkyAI API call took {api_elapsed:.2f}ms")
            
            if response.status_code != 200:
                print(f"[/rewrite] SkyAI returned {response.status_code}")
                return sql, None, {}
            
            result = response.json()
            ai_response = result.get("response", result.get("message", ""))
            
            data = {}
            extracted_sql = sql
            
            if isinstance(ai_response, dict):
                data = ai_response
            else:
                try:
                    clean_json = str(ai_response).strip()
                    if "```json" in clean_json.lower():
                        match = re.search(r'```json\s*(.*?)\s*```', clean_json, re.DOTALL | re.IGNORECASE)
                        if match: clean_json = match.group(1).strip()
                    elif "```" in clean_json:
                        match = re.search(r'```\s*(.*?)\s*```', clean_json, re.DOTALL)
                        if match: clean_json = match.group(1).strip()
                    data = json.loads(clean_json)
                except Exception as e:
                    print(f"[/rewrite] Error parsing AI JSON: {e}")
                    # Try to extract SQL from markdown
                    if "```sql" in str(ai_response).lower():
                        match = re.search(r'```sql\s*(.*?)\s*```', str(ai_response), re.DOTALL | re.IGNORECASE)
                        if match: 
                            extracted_sql = match.group(1).strip()
            
            final_sql = data.get("sql", extracted_sql)
            suggested_ddl = data.get("suggested_ddl")
            jira_analysis = data.get("jira_analysis", {})
            
            # Validate SQL
            if final_sql and any(kw in final_sql.upper() for kw in ['SELECT', 'UPDATE', 'DELETE', 'INSERT']):
                return final_sql, suggested_ddl, jira_analysis
            
            return sql, suggested_ddl, jira_analysis
            
        except httpx.TimeoutException:
            print("[/rewrite] SkyAI Copilot timeout")
        except Exception as e:
            print(f"[/rewrite] SkyAI Copilot error: {e}")
        
        return sql, None, {}

    async def rewrite_query(self, request: RewriteRequest) -> RewriteResponse:
        """
        🔧 Self-Healing SQL - Automatic query rewriting!
        
        Analyzes a query for anti-patterns and rewrites it for better performance.
        Uses SkyAI Copilot for intelligent rewriting and RAG for historical context.
        """
        start_total = time.time()
        sql = request.sql.strip()
        if not sql:
            return RewriteResponse(
                original_sql=sql,
                rewritten_sql=sql,
                improvements=[],
                estimated_speedup="0%",
                confidence=0.0,
                explanation="Empty query submitted.",
                similar_jira_tickets=[],
                anti_patterns_detected=[]
            )
        
        # Check cache first for identical queries
        cache_key = f"rewrite:{sql}"
        cached_result = query_rewrite_cache.get(cache_key)
        if cached_result:
            print(f"[CACHE HIT] Returning cached rewrite result")
            return cached_result
        
        sql_upper = sql.upper()
        
        # Step 1: Detect anti-patterns
        anti_patterns = []
        rewrite_hints = []
        
        # Pattern: IN (SELECT ...) - subquery that can be JOIN
        if re.search(r'\bIN\s*\(\s*SELECT\b', sql_upper):
            anti_patterns.append("IN (SELECT ...) subquery - can be rewritten as JOIN")
            rewrite_hints.append("Convert IN subquery to INNER JOIN for better performance")
        
        # Pattern: SELECT * - should specify columns
        if re.search(r'\bSELECT\s+\*\b', sql_upper):
            anti_patterns.append("SELECT * - retrieves all columns unnecessarily")
            rewrite_hints.append("Specify only required columns instead of SELECT *")
        
        # Pattern: LIKE '%...' - leading wildcard prevents index use
        if re.search(r"LIKE\s+['\"]%", sql_upper):
            anti_patterns.append("LIKE '%...' - leading wildcard prevents index usage")
            rewrite_hints.append("Consider FULLTEXT search or restructuring the query")
        
        # Pattern: OR on different columns - often can be UNION
        if re.search(r'\bWHERE\b.*\bOR\b.*\bOR\b', sql_upper):
            anti_patterns.append("Multiple OR conditions - may prevent index optimization")
            rewrite_hints.append("Consider splitting into UNION ALL for index usage")
        
        # Pattern: NOT IN (SELECT ...) - often slow
        if re.search(r'\bNOT\s+IN\s*\(\s*SELECT\b', sql_upper):
            anti_patterns.append("NOT IN (SELECT ...) - can be slow with NULLs")
            rewrite_hints.append("Consider LEFT JOIN + IS NULL or NOT EXISTS")
        
        # Pattern: Correlated subquery in SELECT
        if re.search(r'\bSELECT\b.*\(\s*SELECT\b', sql_upper) and 'WHERE' not in sql_upper.split('(')[0]:
            anti_patterns.append("Correlated subquery in SELECT - executes per row")
            rewrite_hints.append("Consider rewriting as JOIN with aggregation")
        
        # Pattern: ORDER BY without LIMIT
        if 'ORDER BY' in sql_upper and 'LIMIT' not in sql_upper:
            anti_patterns.append("ORDER BY without LIMIT - sorts entire result set")
            rewrite_hints.append("Add LIMIT if only top N results are needed")
        
        # 🚀 PARALLEL: Start RAG search (uses new helper method)
        similar_jira_tickets, similar_docs = await self._search_similar_jira(sql)
        
        # Fill default analyses for tickets with content preview
        for ticket in similar_jira_tickets:
            raw_content = next((d['content'] for d in similar_docs if d['source_id'] == ticket.id), "")
            if raw_content:
                preview = raw_content.split('\n')[0][:100]
                if len(preview) < 20:
                    preview = raw_content[:100].replace('\n', ' ')
                ticket.analysis = f"Insight: {preview}..."
            else:
                ticket.analysis = "Analysing historical context..."
        # 🚀 OPTIMIZED: Use new helper for SkyAI call (with trimmed prompt)
        rewritten_sql, suggested_ddl, jira_analysis = await self._call_skyai(
            sql, anti_patterns, similar_jira_tickets, similar_docs
        )
        
        # Set default values
        improvements = rewrite_hints
        if rewritten_sql != sql:
            estimated_speedup = f"{min(95, len(anti_patterns) * 30)}%"
            confidence = min(0.95, 0.6 + len(anti_patterns) * 0.1)
            explanation = f"Query réécrite pour corriger {len(anti_patterns)} anti-pattern(s). " + \
                         f"Améliorations: {', '.join(improvements[:2])}."
        else:
            estimated_speedup = f"{min(95, len(anti_patterns) * 20)}%" if anti_patterns else "0%"
            confidence = 0.5
            explanation = f"Analyse détectée {len(anti_patterns)} opportunité(s) d'optimisation." if anti_patterns else "No optimization applied."
        
        # Apply AI analyses to tickets
        for ticket in similar_jira_tickets:
            ai_analysis = jira_analysis.get(ticket.id) or jira_analysis.get(ticket.id.split('#')[0])
            if ai_analysis:
                ticket.analysis = ai_analysis
            elif not ticket.analysis or ticket.analysis.strip() == "":
                raw_content = next((d['content'] for d in similar_docs if d['source_id'] == ticket.id), "")
                if raw_content:
                    clean_content = raw_content.replace("\n", " ").strip()
                    ticket.analysis = f"Content Preview: {clean_content[:150]}..."
                else:
                    ticket.analysis = "Analysis unavailable"
        
        # Fallback: Apply heuristic rewrites if AI didn't respond or returned same query
        if rewritten_sql == sql and anti_patterns:
            # 1. Basic IN subquery to JOIN rewrite
            if 'IN (SELECT' in sql_upper:
                # Improved regex to handle newlines and content after subquery
                match = re.search(
                    r'(\w+)\s+IN\s*\(\s*SELECT\s+(\w+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?\s*\)',
                    sql, re.IGNORECASE | re.DOTALL
                )
                if match:
                    full_match = match.group(0)
                    outer_col = match.group(1)
                    inner_col = match.group(2)
                    inner_table = match.group(3)
                    inner_where = match.group(4)
                    inner_alias = inner_table[0].lower() + "2"
                    
                    # Construction du JOIN
                    join_stmt = f"INNER JOIN {inner_table} {inner_alias} ON {outer_col} = {inner_alias}.{inner_col}"
                    if inner_where:
                        # Clean up inner where
                        clean_inner_where = inner_where.strip()
                        join_stmt += f" AND {inner_alias}.{clean_inner_where}"
                    
                    # Remplacement intelligent : on enlève la partie IN (...) de la clause WHERE
                    # Si c'était la seule condition, on enlève 'WHERE'
                    # Sinon on garde le reste
                    
                    # On cherche si le IN est précédé de WHERE
                    where_pattern = r'\s+WHERE\s+' + re.escape(full_match)
                    if re.search(where_pattern, sql, re.IGNORECASE | re.DOTALL):
                        rewritten_sql = re.sub(where_pattern, f" {join_stmt} WHERE ", sql, flags=re.IGNORECASE | re.DOTALL)
                    else:
                        rewritten_sql = sql.replace(full_match, f" {join_stmt} ")
                    
                    # Nettoyage si on a "WHERE AND" ou "WHERE OR" ou "WHERE )"
                    rewritten_sql = re.sub(r'WHERE\s+(AND|OR)\s+', 'WHERE ', rewritten_sql, flags=re.IGNORECASE)
                    rewritten_sql = re.sub(r'WHERE\s+\)', ')', rewritten_sql, flags=re.IGNORECASE)
                    # Si WHERE est vide à la fin
                    rewritten_sql = re.sub(r'WHERE\s*$', '', rewritten_sql, flags=re.IGNORECASE)

                    explanation = "Réécriture heuristique appliquée pour convertir IN subquery en JOIN."
    
            # 2. SELECT * to SELECT [columns] (heuristic)
            if 'SELECT *' in rewritten_sql.upper():
                # Try to guess table from FROM clause
                from_match = re.search(r'FROM\s+(\w+)', rewritten_sql, re.IGNORECASE)
                if from_match:
                    table = from_match.group(1)
                    # Mock a list of columns for common tables in our shop demo
                    cols_map = {
                        "orders": "id, customer_id, order_date, total_amount, status",
                        "shop_orders": "id, customer_id, order_date, total_amount, status",
                        "customers": "id, name, email, country, segment",
                        "shop_customers": "id, name, email, country, segment",
                        "products": "id, name, category, price, stock",
                        "shop_products": "id, name, category, price, stock"
                    }
                    if table.lower() in cols_map:
                         rewritten_sql = re.sub(r'SELECT\s+\*', f"SELECT {cols_map[table.lower()]}", rewritten_sql, flags=re.IGNORECASE)
                         explanation += " SELECT * remplacé par la liste explicite des colonnes."
    
        # Step 4: Optional Automatic Index Simulation for the rewritten query
        simulation_data = None
        if rewritten_sql != sql:
            try:
                # Try to guess a good index if the rewrite added a WHERE/JOIN column
                proposed_idx = None
                # Extract JOIN/WHERE columns for index proposal
                columns_match = re.findall(r'(\w+)\s*=\s*\w+\.\w+|(\w+)\s*=\s*(?:[\'"][\w\s\-_]+[\'"]|[:\w\d?]+)', rewritten_sql)
                if columns_match:
                    potential_cols = [c[0] or c[1] for c in columns_match if c[0] or c[1]]
                    if potential_cols:
                        table_match = re.search(r'FROM\s+(\w+)|JOIN\s+(\w+)', rewritten_sql, re.IGNORECASE)
                        table = (table_match.group(1) or table_match.group(2)) if table_match else "unknown"
                        idx_name = f"idx_auto_{potential_cols[0]}"
                        proposed_idx = f"CREATE INDEX {idx_name} ON {table}({potential_cols[0]})"
                
                if proposed_idx and self.index_service:
                    simulation_data = await self.index_service.perform_index_simulation(rewritten_sql, proposed_idx)
            except Exception as e:
                print(f"[/rewrite] Auto-simulation failed: {e}")

        # Resolve final suggested_ddl
        final_suggested_ddl = None
        if 'suggested_ddl' in locals() and suggested_ddl:
            final_suggested_ddl = suggested_ddl
        elif simulation_data and hasattr(simulation_data, 'create_index_sql') and simulation_data.create_index_sql:
            final_suggested_ddl = simulation_data.create_index_sql

        # 📊 Performance timing
        total_time = (time.time() - start_total) * 1000
        print(f"[PERF] Total rewrite_query took {total_time:.2f}ms")

        response = RewriteResponse(
            original_sql=sql,
            rewritten_sql=rewritten_sql,
            improvements=improvements,
            estimated_speedup=estimated_speedup,
            confidence=confidence,
            explanation=explanation,
            similar_jira_tickets=similar_jira_tickets,
            anti_patterns_detected=anti_patterns,
            suggested_ddl=final_suggested_ddl,
            simulation=simulation_data
        )
        
        # Cache the result for future identical queries
        query_rewrite_cache.set(cache_key, response)
        
        return response

    async def execute_fix(self, request) -> dict:
        """
        Execute a suggested optimization fix (e.g. CREATE INDEX)
        WARNING: Only allowing CREATE INDEX/DROP INDEX/ALTER TABLE for demo safety
        """
        from database import get_db_connection
        
        sql = request.sql.strip()
        database = request.database or "shop_demo"
        
        # Simple validation
        sql_upper = sql.upper()
        safe_commands = ["CREATE INDEX", "CREATE UNIQUE INDEX", "DROP INDEX", "ALTER TABLE"]
        
        # Allow SELECT only if specifically requested or maybe just reject?
        # For now, stick to DDL as "Fixes" usually imply schema changes in this context,
        # OR if it's a rewritten query, maybe we want to run it?
        # But the method name is execute_fix.
        
        if not any(sql_upper.startswith(cmd) for cmd in safe_commands):
            return {
                "success": False, 
                "message": "Invalid command", 
                "error": "Only CREATE/DROP INDEX or ALTER TABLE commands are allowed for safety."
            }
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            # Split multiple statements if they exist
            for statement in sql.split(';'):
                if statement.strip():
                    print(f"[/execute-fix] Executing on {database}: {statement}")
                    cursor.execute(f"USE {database}")
                    cursor.execute(statement)
            conn.commit()
            conn.close()
            return {"success": True, "message": f"Fix executed successfully on {database}"}
        except Exception as e:
            print(f"[/execute-fix] Error: {e}")
            return {"success": False, "message": "Execution failed", "error": str(e)}
