from fastapi import APIRouter
import deps
from schemas.mcp import MCPExecuteRequest

router = APIRouter()

@router.get("/manifest")
async def get_mcp_manifest():
    """Expose MCP tools manifest for LLMs"""
    if deps.mcp_service:
        return deps.mcp_service.get_tools_manifest()
    return {"tools": []}

@router.post("/execute")
async def execute_mcp_tool(request: MCPExecuteRequest):
    """Execute an MCP tool"""
    if deps.mcp_service:
        return deps.mcp_service.execute_tool(request.tool, request.arguments)
    return {"error": "MCP Service not available"}

@router.get("/history")
async def get_mcp_history():
    """Get recent MCP tool execution history"""
    if deps.mcp_service:
        return deps.mcp_service.tool_history
    return []
