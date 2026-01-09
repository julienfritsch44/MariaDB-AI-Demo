
import asyncio
import time
import os
import httpx
import logging
from database import get_db_connection
from config import SKYAI_AGENT_ID
from error_factory import ErrorFactory, DatabaseError, ServiceError, APIError

logger = logging.getLogger("uvicorn")

class DiagnosticService:
    def __init__(self, embedding_service=None, vector_store=None):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def get_all_diagnostics(self):
        """Run all diagnostic checks concurrently"""
        results_mariadb, results_embeddings, results_jira, results_skyai = await asyncio.gather(
            self.check_mariadb(),
            self.check_embeddings(),
            self.check_jira(),
            self.check_skyai()
        )
        
        final_results = [results_mariadb, results_embeddings, results_jira]
        final_results.extend(results_skyai)
        return final_results

    async def check_mariadb(self):
        start = time.time()
        try: 
            loop = asyncio.get_running_loop()
            
            def _connect():
                conn = get_db_connection()
                conn.close()
                
            await loop.run_in_executor(None, _connect)
            
            return {
                "service": "MariaDB Connection",
                "status": "online",
                "latency_ms": round((time.time() - start) * 1000, 2)
            }
        except Exception as e:
            # Use ErrorFactory for structured error handling
            db_error = ErrorFactory.database_error(
                "MariaDB connection check failed",
                original_error=e,
                service="MariaDB Connection"
            )
            error_msg = str(e)
            
            # Detect specific SkySQL quota exhaustion
            if "Connection killed by MaxScale" in error_msg or "Lost connection" in error_msg:
                return {
                    "service": "MariaDB Connection",
                    "status": "offline",
                    "error": error_msg,
                    "hint": "⚠️ SkySQL quota may be exhausted (0 MCU-h). Database is stopped until next month."
                }
            
            return {
                "service": "MariaDB Connection",
                "status": "offline",
                "error": error_msg
            }

    async def check_embeddings(self):
        start = time.time()
        try:
            if not self.embedding_service:
                return {
                    "service": "Local Embeddings",
                    "status": "offline",
                    "error": "Service not initialized"
                }

            loop = asyncio.get_running_loop()
            info = await loop.run_in_executor(None, self.embedding_service.get_info)
            
            return {
                "service": "Local Embeddings",
                "status": "online",
                "latency_ms": round((time.time() - start) * 1000, 2),
                "info": info
            }
        except Exception as e:
            # Use ErrorFactory for structured error handling
            service_error = ErrorFactory.service_error(
                "Local Embeddings",
                "Embeddings service check failed",
                original_error=e
            )
            return {
                "service": "Local Embeddings",
                "status": "offline",
                "error": str(e)
            }

    async def check_jira(self):
        start = time.time()
        try:
            if not self.vector_store:
                return {
                    "service": "Jira Knowledge Base",
                    "status": "offline",
                    "error": "Vector Store not initialized"
                }

            loop = asyncio.get_running_loop()
            # Add timeout to prevent hanging
            count = await asyncio.wait_for(
                loop.run_in_executor(None, self.vector_store.get_document_count),
                timeout=5.0
            )
            
            # Ensure count is an integer for comparison
            count = int(count) if count is not None else 0
            
            return {
                "service": "Jira Knowledge Base",
                "status": "online" if count > 0 else "empty",
                "latency_ms": round((time.time() - start) * 1000, 2),
                "document_count": count
            }
        except asyncio.TimeoutError:
            logger.error(f"Jira check timed out after 5 seconds")
            return {
                "service": "Jira Knowledge Base",
                "status": "error",
                "error": "Timeout: Vector store check took too long (>5s)"
            }
        except Exception as e:
            # Use ErrorFactory for structured error handling
            service_error = ErrorFactory.service_error(
                "Jira Knowledge Base",
                "Vector store check failed",
                original_error=e
            )
            error_msg = str(e)
            
            # Detect specific SkySQL quota exhaustion
            if "Connection killed by MaxScale" in error_msg or "Lost connection" in error_msg:
                return {
                    "service": "Jira Knowledge Base",
                    "status": "error",
                    "error": error_msg,
                    "hint": "⚠️ SkySQL quota may be exhausted (0 MCU-h). Database is stopped until next month."
                }
            
            return {
                "service": "Jira Knowledge Base",
                "status": "error",
                "error": error_msg
            }

    async def check_skyai(self):
        start = time.time()
        skysql_api_key = os.getenv("SKYSQL_API_KEY")
        results = []
        
        if not skysql_api_key:
            results.append({
                "service": "SkyAI Copilot API",
                "status": "config_missing",
                "message": "SKYSQL_API_KEY is not set"
            })
            return results

        # 1. Provisioning Check
        service_url = "https://api.skysql.com/provisioning/v1/services"
        try:
            async with httpx.AsyncClient() as client:
                res_prov = await client.get(
                    service_url,
                    headers={
                        "X-API-Key": skysql_api_key,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                    timeout=5.0
                )
            if res_prov.status_code == 200:
                results.append({
                    "service": "MariaDB Cloud API Auth",
                    "status": "online",
                    "message": "API Key is valid (Provisioning access OK)"
                })
            else:
                results.append({
                    "service": "MariaDB Cloud API Auth",
                    "status": "error",
                    "message": f"Auth failed (HTTP {res_prov.status_code})",
                    "error": res_prov.text[:100]
                })
        except Exception as e:
            # Use ErrorFactory for structured error handling
            api_error = ErrorFactory.api_error(
                "SkyAI authentication check failed",
                status_code=500,
                original_error=e,
                endpoint=service_url
            )
            results.append({
                "service": "MariaDB Cloud API Auth",
                "status": "offline",
                "error": str(e)
            })

        # 2. Copilot Check
        variants = [
            "https://api.skysql.com/copilot/v1/chat/",
            "https://api.skysql.com/copilot/v1/chat"
        ]
        
        success = False
        last_error = ""
        last_status = 404
        
        for url in variants:
            try:
                headers = {
                    "X-API-Key": skysql_api_key, 
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                }
                payload = {
                    "prompt": "PING",
                    "agent_id": SKYAI_AGENT_ID
                }

                async with httpx.AsyncClient(follow_redirects=True) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload,
                        timeout=5.0
                    )
                
                if response.status_code == 200:
                    results.append({
                        "service": "SkyAI Copilot API",
                        "status": "online",
                        "latency_ms": round((time.time() - start) * 1000, 2),
                        "http_status": 200,
                        "url": url
                    })
                    success = True
                    break
                else:
                    last_status = response.status_code
                    if "<!doctype html>" in response.text.lower() or "<html" in response.text.lower():
                        last_error = f"HTML Response received. First 50 chars: {response.text.strip()[:50]}"
                    else:
                        last_error = response.text[:100]
            except Exception as e:
                # Use ErrorFactory for structured error handling
                api_error = ErrorFactory.api_error(
                    "SkyAI Copilot API check failed",
                    status_code=500,
                    original_error=e,
                    endpoint=url
                )
                last_error = str(e)
        
        if not success:
            results.append({
                "service": "SkyAI Copilot API",
                "status": "error",
                "latency_ms": round((time.time() - start) * 1000, 2),
                "http_status": last_status,
                "error": last_error or "All endpoint variants failed"
            })
            
        return results
