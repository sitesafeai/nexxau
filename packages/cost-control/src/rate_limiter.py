"""
Rate Limiter

Rate limiting for cost control (SMS, snapshots, etc.).
"""
import time
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Rate limiter for cost control.
    
    Tracks usage per tenant/resource and enforces limits.
    """
    
    def __init__(
        self,
        max_requests: int,
        window_seconds: float,
        redis_client: Optional[object] = None
    ):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests per window
            window_seconds: Time window in seconds
            redis_client: Redis client for distributed rate limiting (optional)
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.redis_client = redis_client
        
        # In-memory fallback (if no Redis)
        self._local_counts: Dict[str, list] = {}
    
    def is_allowed(
        self,
        key: str,
        amount: int = 1
    ) -> tuple[bool, Optional[int]]:
        """
        Check if request is allowed.
        
        Args:
            key: Rate limit key (e.g., tenant_id:resource)
            amount: Request amount (default: 1)
            
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        if self.redis_client:
            return self._check_redis(key, amount)
        else:
            return self._check_local(key, amount)
    
    def _check_redis(
        self,
        key: str,
        amount: int
    ) -> tuple[bool, Optional[int]]:
        """Check rate limit using Redis"""
        try:
            redis_key = f"ratelimit:{key}"
            current_time = time.time()
            window_start = current_time - self.window_seconds
            
            # Use Redis sorted set for sliding window
            pipe = self.redis_client.pipeline()
            pipe.zremrangebyscore(redis_key, 0, window_start)
            pipe.zcard(redis_key)
            pipe.zadd(redis_key, {str(current_time): current_time})
            pipe.expire(redis_key, int(self.window_seconds) + 1)
            results = pipe.execute()
            
            current_count = results[1] or 0
            
            if current_count + amount > self.max_requests:
                remaining = max(0, self.max_requests - current_count)
                return False, remaining
            
            # Add requests
            for _ in range(amount):
                self.redis_client.zadd(redis_key, {str(current_time): current_time})
            
            remaining = self.max_requests - (current_count + amount)
            return True, remaining
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}", exc_info=True)
            # Fallback to local
            return self._check_local(key, amount)
    
    def _check_local(
        self,
        key: str,
        amount: int
    ) -> tuple[bool, Optional[int]]:
        """Check rate limit using local memory"""
        current_time = time.time()
        window_start = current_time - self.window_seconds
        
        if key not in self._local_counts:
            self._local_counts[key] = []
        
        # Remove old entries
        self._local_counts[key] = [
            t for t in self._local_counts[key]
            if t >= window_start
        ]
        
        current_count = len(self._local_counts[key])
        
        if current_count + amount > self.max_requests:
            remaining = max(0, self.max_requests - current_count)
            return False, remaining
        
        # Add requests
        for _ in range(amount):
            self._local_counts[key].append(current_time)
        
        remaining = self.max_requests - (current_count + amount)
        return True, remaining
    
    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key"""
        is_allowed, remaining = self.is_allowed(key, amount=0)
        return remaining or 0
    
    def reset(self, key: str) -> None:
        """Reset rate limit for key"""
        if self.redis_client:
            redis_key = f"ratelimit:{key}"
            self.redis_client.delete(redis_key)
        else:
            if key in self._local_counts:
                del self._local_counts[key]

