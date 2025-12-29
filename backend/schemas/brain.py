from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class BrainChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class BrainSource(BaseModel):
    type: str  # "jira" or "docs"
    id: str
    title: str
    relevance: str

class BrainChatResponse(BaseModel):
    answer: str
    sources: List[BrainSource]
    kb_count: int

class ChatRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
