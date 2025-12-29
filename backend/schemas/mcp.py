from pydantic import BaseModel
from typing import Dict, Any

class MCPExecuteRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any]
