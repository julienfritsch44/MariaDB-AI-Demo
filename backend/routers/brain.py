from fastapi import APIRouter, HTTPException, Body
import os
import time
import requests
import deps
from schemas.brain import BrainChatRequest, BrainChatResponse, BrainSource, ChatRequest
from error_factory import ErrorFactory, APIError, ServiceError, DatabaseError

router = APIRouter()

@router.post("/chat", response_model=BrainChatResponse)
async def brain_chat(request: BrainChatRequest):
    """
    MariaDB Brain - Ask anything about MariaDB!
    Uses RAG with 10 years of Jira tickets and documentation.
    """
    if not deps.rag_enabled:
        return BrainChatResponse(
            answer="⚠️ The knowledge base is currently offline. Please check the backend configuration.",
            sources=[],
            kb_count=0
        )
    
    start_total = time.time()
    user_message = request.message.strip()
    if not user_message:
        return BrainChatResponse(
            answer="Please ask me a question about MariaDB!",
            sources=[],
            kb_count=0
        )
    
    # 1. Get embedding for user question
    try:
        query_embedding = deps.embedding_service.get_embedding(user_message)
        similar_docs = deps.vector_store.search_similar(query_embedding, limit=5)
        
        # Build context from retrieved documents
        context_parts = []
        sources = []
        for doc in similar_docs:
            source_type = doc.get('source_type', 'unknown')
            source_id = doc.get('source_id', 'unknown')
            content = doc.get('content', '')[:500]
            context_parts.append(f"[{source_type}:{source_id}]\n{content}")
            
            # Parse source for display
            sources.append(BrainSource(
                type=source_type,
                id=source_id,
                title=source_id if source_type == "jira" else "Documentation",
                relevance=""  # Will be filled by AI
            ))
        
        context = "\n\n".join(context_parts)
        
    except Exception as e:
        # Use ErrorFactory for service errors
        service_error = ErrorFactory.service_error(
            "Vector Store Search",
            "Brain chat vector search failed",
            original_error=e
        )
        print(f"[/brain/chat] Vector search failed: {service_error}")
        context = ""
        sources = []
    
    # 2. Generate AI response using SkyAI Copilot
    try:
        skysql_api_key = os.getenv("SKYSQL_API_KEY")
        if not skysql_api_key:
            raise Exception("SKYSQL_API_KEY not configured")
        
        prompt = f"""You are MariaDB Brain - an AI assistant that knows everything about MariaDB.
You have access to 10 years of Jira tickets, bug reports, and documentation.

USER QUESTION: {user_message}

RETRIEVED KNOWLEDGE BASE CONTEXT:
{context if context else "No specific context retrieved."}

INSTRUCTIONS:
1. Answer the user's question directly and helpfully
2. If the retrieved context contains relevant information, cite it naturally (e.g., "According to MDEV-XXXX...")
3. Be concise but thorough
4. If you don't know something or it's not in the context, say so honestly
5. Focus on being practical and actionable
6. Use markdown formatting for code blocks, lists, etc.

Respond with a helpful answer:"""

        response = requests.post(
            "https://api.skysql.com/copilot/v1/chat",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": skysql_api_key
            },
            json={"prompt": prompt},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result.get("answer", "No response from AI.")
        else:
            raise Exception(f"SkyAI returned {response.status_code}")
        
    except Exception as e:
        # Use ErrorFactory for API errors
        api_error = ErrorFactory.api_error(
            "SkyAI Brain chat generation failed",
            status_code=500,
            original_error=e,
            endpoint="/copilot/v1/chat"
        )
        print(f"[/brain/chat] AI generation failed: {api_error}")
        # Provide context-based response when AI is unavailable
        if sources:
            answer = f"Based on the knowledge base, I found {len(sources)} relevant sources:\n\n"
            for src in sources[:3]:
                answer += f"- **{src.id}**: {src.title}\n"
            answer += "\nPlease check these sources for detailed information."
        else:
            answer = f"I'm unable to process your question at the moment. (Error: {str(e)[:100]})"
    
    # Get KB count
    kb_count = 0
    try:
        kb_count = deps.vector_store.get_document_count()
    except:
        pass
    
    elapsed_total = (time.time() - start_total) * 1000
    print(f"[PERF] Total /brain/chat processing took {elapsed_total:.2f}ms")

    return BrainChatResponse(
        answer=answer,
        sources=sources[:3],  # Top 3 sources
        kb_count=kb_count
    )


@router.get("/stats")
async def brain_stats():
    """Get knowledge base statistics"""
    if not deps.rag_enabled:
        return {"kb_count": 0, "status": "offline"}
    
    try:
        kb_count = deps.vector_store.get_document_count()
        return {"kb_count": kb_count, "status": "online"}
    except Exception as e:
        # Use ErrorFactory for service errors
        service_error = ErrorFactory.service_error(
            "Vector Store Status",
            "Failed to get brain stats",
            original_error=e
        )
        return {"kb_count": 0, "status": "error", "error": str(service_error)}

# Copilot Chat Endpoint (Moved here as it relates to AI Chat)
@router.post("/copilot/chat")
async def copilot_chat(request: ChatRequest = Body(...)):
    """
    Forward chat to SkyAI Copilot API (MariaDB's native AI assistant)
    """
    import httpx
    
    skysql_api_key = os.getenv("SKYSQL_API_KEY")
    
    if not skysql_api_key:
        raise HTTPException(
            status_code=503,
            detail="SkyAI Copilot is not configured. Please set SKYSQL_API_KEY environment variable."
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.skysql.com/copilot/v1/chat",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": skysql_api_key
                },
                json={"prompt": request.prompt, "context": request.context},
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"SkyAI Copilot API error: {response.text}"
                )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="SkyAI Copilot request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"SkyAI Copilot connection failed: {str(e)}")
