"""
Circuit Breaker

Circuit breaker pattern for cost control and graceful degradation.
"""
import time
import logging
from enum import Enum
from typing import Optional, Callable
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5  # Open circuit after N failures
    success_threshold: int = 2  # Close circuit after N successes (half-open)
    timeout_seconds: float = 60.0  # Time before attempting half-open
    failure_window_seconds: float = 60.0  # Window for counting failures


class CircuitBreaker:
    """
    Circuit breaker for cost control.
    
    Prevents resource exhaustion by stopping requests when thresholds are exceeded.
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ):
        """
        Initialize circuit breaker.
        
        Args:
            name: Circuit breaker name (for logging)
            config: Configuration (uses defaults if None)
        """
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.state_change_time: Optional[float] = None
    
    def call(self, func: Callable, *args, **kwargs):
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerOpenError: If circuit is open
            Exception: Original exception from function
        """
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self._transition_to_half_open()
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is OPEN"
                )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit should attempt reset (transition to half-open)"""
        if self.state_change_time is None:
            return False
        
        elapsed = time.time() - self.state_change_time
        return elapsed >= self.config.timeout_seconds
    
    def _transition_to_half_open(self) -> None:
        """Transition circuit to half-open state"""
        logger.info(
            f"Circuit breaker {self.name} transitioning to HALF_OPEN",
            extra={'circuit_breaker': self.name, 'state': CircuitState.HALF_OPEN.value}
        )
        self.state = CircuitState.HALF_OPEN
        self.state_change_time = time.time()
        self.success_count = 0
    
    def _on_success(self) -> None:
        """Handle successful execution"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self._transition_to_closed()
        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success (in closed state)
            self.failure_count = 0
            self.last_failure_time = None
    
    def _on_failure(self) -> None:
        """Handle failed execution"""
        current_time = time.time()
        
        # Reset failure count if window expired
        if (
            self.last_failure_time is not None and
            current_time - self.last_failure_time > self.config.failure_window_seconds
        ):
            self.failure_count = 0
        
        self.failure_count += 1
        self.last_failure_time = current_time
        
        if self.state == CircuitState.HALF_OPEN:
            self._transition_to_open()
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.config.failure_threshold:
                self._transition_to_open()
    
    def _transition_to_open(self) -> None:
        """Transition circuit to open state"""
        logger.warning(
            f"Circuit breaker {self.name} opening (failures: {self.failure_count})",
            extra={
                'circuit_breaker': self.name,
                'state': CircuitState.OPEN.value,
                'failure_count': self.failure_count
            }
        )
        self.state = CircuitState.OPEN
        self.state_change_time = time.time()
    
    def _transition_to_closed(self) -> None:
        """Transition circuit to closed state"""
        logger.info(
            f"Circuit breaker {self.name} closing (recovered)",
            extra={'circuit_breaker': self.name, 'state': CircuitState.CLOSED.value}
        )
        self.state = CircuitState.CLOSED
        self.state_change_time = time.time()
        self.failure_count = 0
        self.success_count = 0
    
    def is_open(self) -> bool:
        """Check if circuit is open"""
        if self.state == CircuitState.OPEN and self._should_attempt_reset():
            self._transition_to_half_open()
        return self.state == CircuitState.OPEN
    
    def reset(self) -> None:
        """Manually reset circuit breaker"""
        logger.info(f"Circuit breaker {self.name} manually reset")
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state_change_time = None


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass

