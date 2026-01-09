"""
Structured Error Handling Module

This module provides a centralized error handling system with custom exception
hierarchy and factory methods for creating categorized errors.

Usage:
    from error_factory import ErrorFactory
    
    # Database errors
    raise ErrorFactory.database_error("Connection failed", original_error=e)
    
    # API errors
    raise ErrorFactory.api_error("Invalid request", status_code=400)
    
    # Configuration errors
    raise ErrorFactory.configuration_error("Missing API key", hint="Set SKYSQL_API_KEY")
"""

import logging
from typing import Optional

logger = logging.getLogger("uvicorn")


# Custom Exception Hierarchy
class AppError(Exception):
    """Base exception for all application errors"""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None, **context):
        self.message = message
        self.original_error = original_error
        self.context = context
        super().__init__(self.message)
    
    def __str__(self):
        base_msg = self.message
        if self.original_error:
            base_msg += f" | Original: {str(self.original_error)}"
        if self.context:
            context_str = ", ".join(f"{k}={v}" for k, v in self.context.items())
            base_msg += f" | Context: {context_str}"
        return base_msg


class DatabaseError(AppError):
    """Errors related to database operations"""
    pass


class APIError(AppError):
    """Errors related to API calls (internal or external)"""
    
    def __init__(self, message: str, status_code: int = 500, 
                 original_error: Optional[Exception] = None, **context):
        self.status_code = status_code
        super().__init__(message, original_error, status_code=status_code, **context)


class ConfigurationError(AppError):
    """Errors related to configuration issues"""
    
    def __init__(self, message: str, hint: Optional[str] = None, 
                 original_error: Optional[Exception] = None, **context):
        self.hint = hint
        if hint:
            context['hint'] = hint
        super().__init__(message, original_error, **context)


class ValidationError(AppError):
    """Errors related to data validation"""
    
    def __init__(self, message: str, field: Optional[str] = None, 
                 original_error: Optional[Exception] = None, **context):
        self.field = field
        if field:
            context['field'] = field
        super().__init__(message, original_error, **context)


class ServiceError(AppError):
    """Errors related to external service calls"""
    
    def __init__(self, service_name: str, message: str, 
                 original_error: Optional[Exception] = None, **context):
        self.service_name = service_name
        super().__init__(message, original_error, service=service_name, **context)


# ErrorFactory - Centralized error creation with logging
class ErrorFactory:
    """Factory class for creating structured errors with automatic logging"""
    
    @staticmethod
    def database_error(message: str, original_error: Optional[Exception] = None, 
                      **context) -> DatabaseError:
        """
        Create a database error with logging
        
        Args:
            message: Human-readable error description
            original_error: The original exception that caused this error
            **context: Additional context (e.g., query, table_name)
        
        Returns:
            DatabaseError instance
        """
        error = DatabaseError(message, original_error, **context)
        logger.error(f"DatabaseError: {error}")
        return error
    
    @staticmethod
    def api_error(message: str, status_code: int = 500, 
                  original_error: Optional[Exception] = None, **context) -> APIError:
        """
        Create an API error with logging
        
        Args:
            message: Human-readable error description
            status_code: HTTP status code
            original_error: The original exception that caused this error
            **context: Additional context (e.g., endpoint, method)
        
        Returns:
            APIError instance
        """
        error = APIError(message, status_code, original_error, **context)
        logger.error(f"APIError: {error}")
        return error
    
    @staticmethod
    def configuration_error(message: str, hint: Optional[str] = None, 
                           original_error: Optional[Exception] = None, 
                           **context) -> ConfigurationError:
        """
        Create a configuration error with logging
        
        Args:
            message: Human-readable error description
            hint: Helpful hint for resolving the configuration issue
            original_error: The original exception that caused this error
            **context: Additional context (e.g., config_key, expected_type)
        
        Returns:
            ConfigurationError instance
        """
        error = ConfigurationError(message, hint, original_error, **context)
        logger.error(f"ConfigurationError: {error}")
        return error
    
    @staticmethod
    def validation_error(message: str, field: Optional[str] = None, 
                        original_error: Optional[Exception] = None, 
                        **context) -> ValidationError:
        """
        Create a validation error with logging
        
        Args:
            message: Human-readable error description
            field: The field that failed validation
            original_error: The original exception that caused this error
            **context: Additional context (e.g., expected_value, actual_value)
        
        Returns:
            ValidationError instance
        """
        error = ValidationError(message, field, original_error, **context)
        logger.warning(f"ValidationError: {error}")
        return error
    
    @staticmethod
    def service_error(service_name: str, message: str, 
                     original_error: Optional[Exception] = None, 
                     **context) -> ServiceError:
        """
        Create a service error with logging
        
        Args:
            service_name: Name of the external service
            message: Human-readable error description
            original_error: The original exception that caused this error
            **context: Additional context (e.g., timeout, retry_count)
        
        Returns:
            ServiceError instance
        """
        error = ServiceError(service_name, message, original_error, **context)
        logger.error(f"ServiceError: {error}")
        return error


# Helper function for safe error conversion
def safe_error_message(error: Exception, max_length: int = 200) -> str:
    """
    Extract a safe, truncated error message from an exception
    
    Args:
        error: The exception to extract message from
        max_length: Maximum length of the returned message
    
    Returns:
        Truncated error message string
    """
    msg = str(error)
    if len(msg) > max_length:
        msg = msg[:max_length] + "..."
    return msg
