"""
Simple in-memory cache service for expensive operations
"""
import time
from typing import Any, Optional, Dict
from functools import wraps

class SimpleCache:
    def __init__(self, ttl_seconds: int = 300):
        """
        Initialize cache with TTL (time-to-live) in seconds
        Default: 5 minutes
        """
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key not in self.cache:
            return None
        
        value, timestamp = self.cache[key]
        if time.time() - timestamp > self.ttl:
            # Expired, remove from cache
            del self.cache[key]
            return None
        
        return value
    
    def set(self, key: str, value: Any):
        """Set value in cache with current timestamp"""
        self.cache[key] = (value, time.time())
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
    
    def remove(self, key: str):
        """Remove specific key from cache"""
        if key in self.cache:
            del self.cache[key]

# Global cache instances
query_rewrite_cache = SimpleCache(ttl_seconds=600)  # 10 minutes for rewrites
document_count_cache = SimpleCache(ttl_seconds=60)  # 1 minute for counts
embedding_cache = SimpleCache(ttl_seconds=300)  # 5 minutes for embeddings

def cache_result(cache_instance: SimpleCache, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Usage:
        @cache_result(query_rewrite_cache, "rewrite")
        def expensive_function(arg1, arg2):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            cached = cache_instance.get(cache_key)
            if cached is not None:
                print(f"[CACHE HIT] {cache_key[:100]}")
                return cached
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache_instance.set(cache_key, result)
            print(f"[CACHE MISS] {cache_key[:100]}")
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            cached = cache_instance.get(cache_key)
            if cached is not None:
                print(f"[CACHE HIT] {cache_key[:100]}")
                return cached
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_instance.set(cache_key, result)
            print(f"[CACHE MISS] {cache_key[:100]}")
            return result
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
