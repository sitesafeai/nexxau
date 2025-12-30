"""
Retry Handler

Retry logic with exponential backoff for failed alert deliveries.
"""
import logging
import time
from typing import Callable, Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RetryHandler:
    """
    Handles retries for failed alert deliveries.
    
    Uses exponential backoff with configurable max attempts and jitter.
    """
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_backoff_seconds: float = 1.0,
        max_backoff_seconds: float = 60.0,
        backoff_multiplier: float = 2.0,
        enable_jitter: bool = True
    ):
        """
        Initialize retry handler.
        
        Args:
            max_attempts: Maximum number of retry attempts (default: 3)
            initial_backoff_seconds: Initial backoff time in seconds (default: 1.0)
            max_backoff_seconds: Maximum backoff time in seconds (default: 60.0)
            backoff_multiplier: Multiplier for exponential backoff (default: 2.0)
            enable_jitter: Add random jitter to prevent thundering herd (default: True)
        """
        self.max_attempts = max_attempts
        self.initial_backoff = initial_backoff_seconds
        self.max_backoff = max_backoff_seconds
        self.backoff_multiplier = backoff_multiplier
        self.enable_jitter = enable_jitter
    
    def execute_with_retry(
        self,
        func: Callable,
        operation_name: str,
        context: Optional[Dict[str, Any]] = None,
        *args,
        **kwargs
    ) -> tuple:
        """
        Execute function with retry logic.
        
        Args:
            func: Function to execute
            operation_name: Name of operation (for logging)
            context: Additional context for logging (optional)
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
            
        Returns:
            Tuple of (success: bool, error: Optional[Exception])
        """
        attempt = 0
        last_error = None
        
        while attempt < self.max_attempts:
            try:
                # Execute function
                result = func(*args, **kwargs)
                
                # If function returned True or truthy, consider it success
                if result:
                    if attempt > 0:
                        logger.info(
                            f"Operation succeeded after {attempt} retries",
                            extra={
                                'operation': operation_name,
                                'attempt': attempt + 1,
                                'context': context or {},
                            }
                        )
                    return True, None
                else:
                    # Function returned False, treat as failure
                    raise Exception(f"{operation_name} returned False")
                    
            except Exception as e:
                last_error = e
                attempt += 1
                
                if attempt < self.max_attempts:
                    # Calculate backoff time
                    backoff_seconds = self._calculate_backoff(attempt)
                    
                    logger.warning(
                        f"Operation failed, retrying",
                        extra={
                            'operation': operation_name,
                            'attempt': attempt,
                            'max_attempts': self.max_attempts,
                            'backoff_seconds': backoff_seconds,
                            'error': str(e),
                            'context': context or {},
                        }
                    )
                    
                    # Wait before retry
                    time.sleep(backoff_seconds)
                else:
                    # Max attempts reached
                    logger.error(
                        f"Operation failed after {self.max_attempts} attempts",
                        extra={
                            'operation': operation_name,
                            'attempts': self.max_attempts,
                            'error': str(e),
                            'context': context or {},
                        },
                        exc_info=True
                    )
        
        return False, last_error
    
    def _calculate_backoff(self, attempt: int) -> float:
        """
        Calculate backoff time for retry attempt.
        
        Uses exponential backoff: initial_backoff * (multiplier ^ (attempt - 1))
        With optional jitter to prevent thundering herd.
        
        Args:
            attempt: Current attempt number (1-indexed)
            
        Returns:
            Backoff time in seconds
        """
        # Exponential backoff
        backoff = self.initial_backoff * (self.backoff_multiplier ** (attempt - 1))
        
        # Cap at max backoff
        backoff = min(backoff, self.max_backoff)
        
        # Add jitter if enabled (random value between 0 and 25% of backoff)
        if self.enable_jitter:
            import random
            jitter = random.uniform(0, backoff * 0.25)
            backoff = backoff + jitter
        
        return backoff


class FailureLogger:
    """
    Logs alert delivery failures for monitoring and analysis.
    """
    
    def __init__(self, log_to_database: bool = False, db_pool=None):
        """
        Initialize failure logger.
        
        Args:
            log_to_database: Whether to log failures to database (default: False)
            db_pool: Database connection pool (required if log_to_database=True)
        """
        self.log_to_database = log_to_database
        self.db_pool = db_pool
    
    def log_failure(
        self,
        violation_id: str,
        channel: str,
        error: Exception,
        attempt: int,
        max_attempts: int,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log alert delivery failure.
        
        Args:
            violation_id: Violation identifier
            channel: Alert channel name
            error: Exception that caused failure
            attempt: Attempt number
            max_attempts: Maximum attempts
            context: Additional context
        """
        failure_data = {
            'violation_id': violation_id,
            'channel': channel,
            'error': str(error),
            'error_type': type(error).__name__,
            'attempt': attempt,
            'max_attempts': max_attempts,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'context': context or {}
        }
        
        # Structured logging
        logger.error(
            f"Alert delivery failure",
            extra=failure_data,
            exc_info=True
        )
        
        # Database logging (if enabled)
        if self.log_to_database and self.db_pool:
            self._log_to_database(failure_data)
    
    def log_success(
        self,
        violation_id: str,
        channel: str,
        attempt: int,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log successful alert delivery (after retries).
        
        Args:
            violation_id: Violation identifier
            channel: Alert channel name
            attempt: Final attempt number
            context: Additional context
        """
        if attempt > 1:
            logger.info(
                f"Alert delivery succeeded after retries",
                extra={
                    'violation_id': violation_id,
                    'channel': channel,
                    'attempt': attempt,
                    'context': context or {},
                }
            )
    
    def _log_to_database(self, failure_data: Dict[str, Any]) -> None:
        """Log failure to database (requires alert_failures table)"""
        # TODO: Implement database logging if alert_failures table exists
        # For now, just log to application logs
        pass

