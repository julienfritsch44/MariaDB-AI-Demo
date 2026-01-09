import os
import httpx
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from error_factory import ErrorFactory, APIError

logger = logging.getLogger(__name__)

class SkySQL_ObservabilityService:
    """Service to fetch logs from SkySQL Observability API"""
    
    def __init__(self):
        self.api_key = os.getenv("SKYSQL_API_KEY")
        self.base_url = "https://api.skysql.com/observability/v2"
        self._set_headers()
        
    def _set_headers(self):
        # Explicitly reload env to pick up changes
        from dotenv import load_dotenv
        load_dotenv()
        
        # Refresh API key from env if needed
        if not self.api_key:
             self.api_key = os.getenv("SKYSQL_API_KEY")

        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        
        # Add Organization Header if present
        org_id = os.getenv("SKYSQL_ORG_ID")
        if org_id:
            self.headers["x-mdb-org"] = org_id
            logger.info(f"Using SkySQL Org ID: {org_id}")
    
    async def get_log_types(self) -> List[str]:
        """Get available log types"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/logs/types",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
                logger.warning(f"Failed to get log types: {response.status_code}")
                return []
        except Exception as e:
            # Use ErrorFactory for API errors
            api_error = ErrorFactory.api_error(
                "Failed to fetch log types from SkySQL",
                status_code=500,
                original_error=e,
                endpoint="/logs/types"
            )
            logger.error(f"Error fetching log types: {api_error}")
            return []
    
    async def get_slow_query_logs(
        self, 
        server_id: Optional[str] = None,
        hours_back: int = 24,
        limit: int = 100
    ) -> List[Dict]:
        """Fetch slow query logs from SkySQL"""
        try:
            # Refresh API key if it was missing during initialization
            if not self.api_key:
                from dotenv import load_dotenv
                load_dotenv()
                self.api_key = os.getenv("SKYSQL_API_KEY")
                self._set_headers()
                
            # Calculate time range
            to_date = datetime.utcnow()
            from_date = to_date - timedelta(hours=hours_back)
            
            # Format dates for API (ISO 8601)
            from_date_str = from_date.isoformat() + "Z"
            to_date_str = to_date.isoformat() + "Z"
            
            # If no server_id provided, try to get from env or detect
            if not server_id:
                server_id = os.getenv("SKYSQL_SERVER_ID")
            
            # Build query payload
            payload = {
                "fromDate": from_date_str,
                "toDate": to_date_str,
                "logType": ["slow-query-log"],  # Correct SkySQL log type name
                "limit": limit,
                "offset": 0,
                "sort": {"field": "timestamp", "order": "desc"}
            }
            
            if server_id:
                payload["serverContext"] = [server_id]
            
            async with httpx.AsyncClient() as client:
                # Try POST /logs/query first
                response = await client.post(
                    f"{self.base_url}/logs/query",
                    headers=self.headers,
                    json=payload,
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logs = data.get("logs", []) if isinstance(data, dict) else data
                    logger.info(f"Fetched {len(logs)} slow query logs from SkySQL API")
                    return logs
                
                logger.warning(f"Slow query API returned {response.status_code}: {response.text[:200]}")
                
                # Fallback: Try GET /logs with query params
                params = {
                    "fromDate": from_date_str,
                    "toDate": to_date_str,
                    "logType": "slow_query",
                    "limit": limit
                }
                if server_id:
                    params["serverContext"] = server_id
                
                response = await client.get(
                    f"{self.base_url}/logs",
                    headers=self.headers,
                    params=params,
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logs = data.get("logs", []) if isinstance(data, dict) else data
                    logger.info(f"Fetched {len(logs)} slow query logs (fallback method)")
                    return logs
                
                logger.error(f"Both API methods failed. Status: {response.status_code}")
                return []
                
        except Exception as e:
            # Use ErrorFactory for API errors
            api_error = ErrorFactory.api_error(
                "Failed to fetch slow query logs from SkySQL",
                status_code=500,
                original_error=e,
                endpoint="/logs/query"
            )
            logger.error(f"Error fetching slow query logs: {api_error}")
            return []
    
    def parse_slow_query_log(self, log_entry: Dict) -> Optional[Dict]:
        """
        Parse a slow query log entry into our standard format
        
        Returns:
            {
                'query_time': float,
                'rows_examined': int,
                'sql_text': str,
                'timestamp': str
            }
        """
        try:
            # SkySQL log format may vary, adapt as needed
            return {
                'query_time': float(log_entry.get('query_time', 0)),
                'rows_examined': int(log_entry.get('rows_examined', 0)),
                'sql_text': log_entry.get('sql_text', log_entry.get('message', '')),
                'timestamp': log_entry.get('timestamp', ''),
                'explain': log_entry.get('explain', None),
                'query_plan': log_entry.get('query_plan', None)
            }
        except Exception as e:
            # Use ErrorFactory for validation/parsing errors
            validation_error = ErrorFactory.validation_error(
                "Failed to parse SkySQL log entry",
                field="log_entry",
                original_error=e
            )
            logger.warning(f"Failed to parse log entry: {validation_error}")
            return None

# Global instance
observability_service = SkySQL_ObservabilityService()
