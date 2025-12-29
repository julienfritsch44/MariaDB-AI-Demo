"""
MCP (Model Context Protocol) Service for MariaDB FinOps Auditor

This module provides MCP-compatible tools for LLMs to interact with the database
and our RAG knowledge base.

MCP Tools:
- query_database: Execute read-only queries on MariaDB
- search_knowledge_base: Search Jira tickets and documentation
- analyze_query: Get optimization suggestions for a SQL query
- get_schema: Get table structure and indexes
"""

import os
import sys
import json
import asyncio
parent_dir = os.path.dirname(os.path.abspath(__file__))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
from typing import List, Dict, Any, Optional
import mariadb
from dotenv import load_dotenv
from mcp.server.stdio import stdio_server
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

# Load .env from the same directory as this script
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

class MCPService:
    """
    MCP-compatible service that exposes database and RAG capabilities
    to LLMs following the Model Context Protocol standard.
    """
    
    def __init__(self, vector_store=None, embedding_service=None):
        self.vector_store = vector_store
        self.embedding_service = embedding_service
        self.tool_history = [] # Shared history for the dashboard
        self.db_params = {
            "host": os.getenv("SKYSQL_HOST"),
            "port": int(os.getenv("SKYSQL_PORT", 3306)),
            "user": os.getenv("SKYSQL_USERNAME"),
            "password": os.getenv("SKYSQL_PASSWORD"),
            "ssl": True
        }
    
    def record_tool_call(self, tool_name: str, args: Dict[str, Any], status: str, detail: str = ""):
        """Record a tool call for the live dashboard feed."""
        from datetime import datetime
        self.tool_history.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "tool": tool_name,
            "arguments": args,
            "status": status,
            "detail": detail or f"Executed {tool_name}"
        })
        # Keep only last 20
        if len(self.tool_history) > 20:
            self.tool_history.pop(0)

    def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP tool and return the result."""
        result = {"error": "Unknown error"}
        try:
            if tool_name == "query_database":
                result = self._query_database(args.get("sql"), args.get("database", "shop_demo"))
            elif tool_name == "search_knowledge_base":
                result = self._search_knowledge_base(args.get("query"), args.get("limit", 5))
            elif tool_name == "analyze_query":
                result = self._analyze_query(args.get("sql"))
            elif tool_name == "get_schema":
                result = self._get_schema(args.get("database"), args.get("table"))
            elif tool_name == "list_databases":
                result = self._list_databases()
            elif tool_name == "list_tables":
                result = self._list_tables(args.get("database"))
            else:
                result = {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            result = {"error": str(e)}
        
        # Record for real-time dashboard
        status = "success" if "error" not in result else "error"
        detail = ""
        if tool_name == "query_database" and status == "success":
            detail = f"Found {result.get('row_count', 0)} rows."
        elif tool_name == "search_knowledge_base" and status == "success":
            detail = f"KB match: {args.get('query')[:30]}..."
        
        self.record_tool_call(tool_name, args, status, detail)
        return result
        """
        Return MCP tools manifest describing available tools.
        This is what an LLM would use to understand our capabilities.
        """
        return {
            "name": "finops-auditor-mcp",
            "version": "1.0.0",
            "description": "MariaDB FinOps Auditor - AI-powered query optimization with private Jira knowledge base",
            "tools": [
                {
                    "name": "query_database",
                    "description": "Execute a read-only SQL query on MariaDB. Only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "sql": {
                                "type": "string",
                                "description": "The SQL query to execute (read-only)"
                            },
                            "database": {
                                "type": "string",
                                "description": "Target database name",
                                "default": "shop_demo"
                            }
                        },
                        "required": ["sql"]
                    }
                },
                {
                    "name": "search_knowledge_base",
                    "description": "Search the Jira knowledge base (1,350+ optimizer-related tickets) for relevant issues and solutions.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Natural language query or SQL pattern to search for"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results",
                                "default": 5
                            }
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "analyze_query",
                    "description": "Analyze a SQL query for performance issues and get optimization suggestions grounded in historical Jira tickets.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "sql": {
                                "type": "string",
                                "description": "The SQL query to analyze"
                            }
                        },
                        "required": ["sql"]
                    }
                },
                {
                    "name": "get_schema",
                    "description": "Get the schema of a table including columns, types, and indexes.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "database": {
                                "type": "string",
                                "description": "Database name"
                            },
                            "table": {
                                "type": "string",
                                "description": "Table name"
                            }
                        },
                        "required": ["database", "table"]
                    }
                },
                {
                    "name": "list_databases",
                    "description": "List all accessible databases.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                },
                {
                    "name": "list_tables",
                    "description": "List all tables in a database.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "database": {
                                "type": "string",
                                "description": "Database name"
                            }
                        },
                        "required": ["database"]
                    }
                }
            ],
            "resources": [
                {
                    "name": "jira_knowledge_base",
                    "description": "1,350+ MariaDB optimizer-related Jira tickets with solutions",
                    "uri": "finops://knowledge-base/jira"
                },
                {
                    "name": "slow_query_log",
                    "description": "Current slow queries detected in the system",
                    "uri": "finops://monitoring/slow-queries"
                }
            ]
        }
    
    def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP tool and return the result."""
        try:
            if tool_name == "query_database":
                return self._query_database(args.get("sql"), args.get("database", "shop_demo"))
            elif tool_name == "search_knowledge_base":
                return self._search_knowledge_base(args.get("query"), args.get("limit", 5))
            elif tool_name == "analyze_query":
                return self._analyze_query(args.get("sql"))
            elif tool_name == "get_schema":
                return self._get_schema(args.get("database"), args.get("table"))
            elif tool_name == "list_databases":
                return self._list_databases()
            elif tool_name == "list_tables":
                return self._list_tables(args.get("database"))
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            return {"error": str(e)}
    
    def _query_database(self, sql: str, database: str = "shop_demo") -> Dict[str, Any]:
        """Execute a read-only SQL query."""
        # Validate read-only
        sql_upper = sql.strip().upper()
        allowed_prefixes = ("SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN")
        if not any(sql_upper.startswith(prefix) for prefix in allowed_prefixes):
            return {"error": "Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed"}
        
        try:
            conn = mariadb.connect(**self.db_params, database=database)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql)
            results = cursor.fetchall()
            conn.close()
            
            return {
                "success": True,
                "rows": results,
                "row_count": len(results)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _search_knowledge_base(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Search the Jira knowledge base using vector similarity."""
        if not self.vector_store or not self.embedding_service:
            return {"error": "Knowledge base not initialized"}
        
        try:
            # Generate embedding for query
            query_embedding = self.embedding_service.get_embedding(query)
            
            # Search vector store
            raw_results = self.vector_store.search_similar(query_embedding, limit=limit * 2, threshold=0.7)
            
            # Deduplicate by source_id
            seen_ids = set()
            results = []
            for r in raw_results:
                if r.get("source_id") not in seen_ids:
                    seen_ids.add(r.get("source_id"))
                    results.append(r)
                if len(results) >= limit:
                    break
            
            # Format results
            formatted = []
            for r in results:
                formatted.append({
                    "source_type": r.get("source_type"),
                    "source_id": r.get("source_id"),
                    "content_preview": r.get("content", "")[:500] + "..." if len(r.get("content", "")) > 500 else r.get("content", ""),
                    "similarity": 1 - r.get("distance", 0)  # Convert distance to similarity
                })
            
            return {
                "success": True,
                "query": query,
                "results": formatted,
                "total_documents_in_kb": self.vector_store.get_document_count() if self.vector_store else 0
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _analyze_query(self, sql: str) -> Dict[str, Any]:
        """Analyze a SQL query for optimization opportunities."""
        result = {
            "query": sql,
            "analysis": {}
        }
        
        # Get EXPLAIN plan
        explain_result = self._query_database(f"EXPLAIN {sql}", "shop_demo")
        if "error" not in explain_result:
            result["analysis"]["explain_plan"] = explain_result.get("rows", [])
        
        # Search knowledge base for similar issues
        if self.embedding_service and self.vector_store:
            kb_result = self._search_knowledge_base(sql, limit=3)
            if "error" not in kb_result:
                result["analysis"]["related_jira_tickets"] = kb_result.get("results", [])
        
        # Basic heuristic analysis
        sql_upper = sql.upper()
        issues = []
        suggestions = []
        
        if "SELECT *" in sql_upper:
            issues.append("Using SELECT * - consider specifying needed columns")
            suggestions.append("Replace SELECT * with specific column names")
        
        if "LIKE '%" in sql_upper:
            issues.append("Leading wildcard in LIKE - cannot use index")
            suggestions.append("Consider using full-text search instead")
        
        if " OR " in sql_upper:
            issues.append("OR conditions may prevent index usage")
            suggestions.append("Consider using UNION or restructuring the query")
        
        if "ORDER BY" in sql_upper and "LIMIT" not in sql_upper:
            issues.append("ORDER BY without LIMIT - may sort entire result set")
            suggestions.append("Add LIMIT clause if only subset needed")
        
        result["analysis"]["issues"] = issues
        result["analysis"]["suggestions"] = suggestions
        
        return result
    
    def _get_schema(self, database: str, table: str) -> Dict[str, Any]:
        """Get table schema including columns and indexes."""
        result = {"database": database, "table": table}
        
        # Get columns
        columns_result = self._query_database(f"DESCRIBE {table}", database)
        if "error" not in columns_result:
            result["columns"] = columns_result.get("rows", [])
        
        # Get indexes
        indexes_result = self._query_database(f"SHOW INDEX FROM {table}", database)
        if "error" not in indexes_result:
            result["indexes"] = indexes_result.get("rows", [])
        
        # Get create statement
        create_result = self._query_database(f"SHOW CREATE TABLE {table}", database)
        if "error" not in create_result and create_result.get("rows"):
            result["create_statement"] = create_result["rows"][0].get("Create Table", "")
        
        return result
    
    def _list_databases(self) -> Dict[str, Any]:
        """List all accessible databases."""
        result = self._query_database("SHOW DATABASES", None)
        if "error" not in result:
            databases = [row.get("Database") for row in result.get("rows", [])]
            return {"success": True, "databases": databases}
        return result
    
    def _list_tables(self, database: str) -> Dict[str, Any]:
        """List all tables in a database."""
        result = self._query_database("SHOW TABLES", database)
        if "error" not in result:
            key = f"Tables_in_{database}"
            tables = [row.get(key) for row in result.get("rows", [])]
            return {"success": True, "database": database, "tables": tables}
        return result


# Singleton instance
_mcp_service = None

def get_mcp_service(vector_store=None, embedding_service=None) -> MCPService:
    """Get or create MCP service singleton."""
    global _mcp_service
    if _mcp_service is None:
        _mcp_service = MCPService(vector_store, embedding_service)
    return _mcp_service


# --- MCP Server Runner ---

async def main():
    """Main entry point for running as a standalone MCP server via stdio."""
    # Initialize services if needed (for Jira search)
    from rag.vector_store import VectorStore
    from rag.embedding_service import EmbeddingService
    
    # DB Params for VectorStore
    db_params = {
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    }
    
    vs = VectorStore(connection_params=db_params)
    es = EmbeddingService()
    
    service = MCPService(vector_store=vs, embedding_service=es)
    server = Server("mariadb-finops-auditor")

    @server.list_tools()
    async def handle_list_tools() -> list[Tool]:
        manifest = service.get_tools_manifest()
        tools = []
        for t in manifest["tools"]:
            tools.append(Tool(
                name=t["name"],
                description=t["description"],
                inputSchema=t["inputSchema"]
            ))
        return tools

    @server.call_tool()
    async def handle_call_tool(name: str, arguments: dict | None) -> list[TextContent]:
        result = service.execute_tool(name, arguments or {})
        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    @server.list_resources()
    async def handle_list_resources() -> list[Resource]:
        manifest = service.get_tools_manifest()
        resources = []
        for r in manifest["resources"]:
            resources.append(Resource(
                uri=r["uri"],
                name=r["name"],
                description=r["description"],
                mimeType="application/json"
            ))
        return resources

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="mariadb-finops",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
