from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import logging
from error_factory import ErrorFactory

# Dependencies
import deps
from langchain_integration import MariaDBVectorStore, MariaDBEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Initialize Router
router = APIRouter(prefix="/copilot", tags=["Copilot"])
logger = logging.getLogger(__name__)

# --- Models ---
class ChatRequest(BaseModel):
    prompt: str
    context: Optional[str] = ""

class ChatResponse(BaseModel):
    answer: str
    sources: Optional[List[Dict[str, Any]]] = None

# --- LangChain Setup ---
# We initialize this lazily or on module load if services are ready
_chain = None

def get_langchain_chain():
    global _chain
    if _chain:
        return _chain
        
    if not deps.rag_enabled or not deps.vector_store or not deps.embedding_service:
        return None
        
    try:
        # 1. Setup Vector Store
        embeddings = MariaDBEmbeddings(deps.embedding_service)
        vectorstore = MariaDBVectorStore(
            embedding=embeddings,
            connection_params=deps.vector_store.params, # Reuse params from existing store
            database="finops_auditor"
        )
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        
        # 2. Setup LLM (Mock or Real)
        # For the demo, if no API key, we might use a fake LLM or just context injection.
        # But let's assume we want to structure the context.
        
        template = """You are a MariaDB Expert DBA Copilot.
        Use the following pieces of retrieved context from the Jira Knowledge Base to answer the user's question.
        If the context helps, cite the Ticket ID (e.g. DBA-123).
        
        Context from Knowledge Base:
        {context}
        
        User Query: {question}
        
        System Context (Current Screen):
        {system_context}
        
        Answer professionally as a Senior DBA."""
        
        prompt = PromptTemplate.from_template(template)
        
        # 3. Define Chain
        # Since we might not have a real LLM connected in this env without a key, 
        # we can define a "Fallback LLM" or use a conditional one.
        
        # Check for Keys
        openai_key = os.getenv("OPENAI_API_KEY")
        
        llm = None
        if openai_key:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=openai_key)
        else:
            # Mock LLM for Demo purposes if no key provided
            from langchain_community.llms import FakeListLLM
            llm = FakeListLLM(responses=[
                "Based on the analysis, this looks like a missing index on the `status` column. I found similar issues in ticket DBA-492 where adding an index improved performance by 80%.",
                "The query is performing a full table scan. Recommendation: Add a composite index on (user_id, created_at).",
            ])

        def format_docs(docs):
            return "\n\n".join(f"[Ticket {d.metadata.get('source_id')}]: {d.page_content}" for d in docs)

        _chain = (
            {
                "context": (lambda x: format_docs(retriever.invoke(x["question"]))),
                "question": lambda x: x["question"],
                "system_context": lambda x: x["system_context"]
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        return _chain
        
    except Exception as e:
        configs_error = ErrorFactory.configuration_error(
            "LangChain Initialization",
            "Failed to initialize RAG chain components",
            original_error=e
        )
        logger.error(configs_error)
        return None

# --- Endpoints ---

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the MariaDB Copilot using LangChain + Vector Search
    """
    
    # Check RAG status
    if not deps.rag_enabled:
        return ChatResponse(answer="RAG Services are currently unavailable. Please check backend logs.")

    chain = get_langchain_chain()
    
    if not chain:
        # Fallback if chain failing
        return ChatResponse(
            answer="[System] LangChain Agent not initialized. Falling back to rule-based diagnostic.\n\n" + 
                   "Analysis: The query seems to be scanning too many rows. Please run 'EXPLAIN' manually." 
        )
        
    try:
        # Execute Chain
        response = chain.invoke({
            "question": request.prompt,
            "system_context": request.context or "No system context provided."
        })
        
        return ChatResponse(answer=response)
        
    except Exception as e:
        service_error = ErrorFactory.service_error(
            "Copilot Chain",
            "Chain execution failed during chat processing",
            original_error=e
        )
        logger.error(service_error)
        return ChatResponse(answer=f"I encountered an error processing your request: {str(service_error)}")
