"""
SMS Rate Limiter

Enforces per-tenant SMS caps to control costs.
"""
import os
import logging
from typing import Optional, Tuple
from redis import Redis

logger = logging.getLogger(__name__)


class SMSRateLimiter:
    """
    Rate limiter for SMS messages per tenant.
    
    Enforces:
    - Max SMS per tenant per hour
    - Max SMS per tenant per day
    """
    
    def __init__(
        self,
        redis_client: Optional[Redis],
        max_sms_per_hour: int = 100,
        max_sms_per_day: int = 1000,
        warning_threshold_hourly: float = 0.8,
        warning_threshold_daily: float = 0.8
    ):
        """
        Initialize SMS rate limiter.
        
        Args:
            redis_client: Redis client for distributed rate limiting
            max_sms_per_hour: Maximum SMS per tenant per hour
            max_sms_per_day: Maximum SMS per tenant per day
            warning_threshold_hourly: Warn at this fraction of hourly limit
            warning_threshold_daily: Warn at this fraction of daily limit
        """
        self.redis_client = redis_client
        self.max_sms_per_hour = max_sms_per_hour
        self.max_sms_per_day = max_sms_per_day
        self.warning_threshold_hourly = warning_threshold_hourly
        self.warning_threshold_daily = warning_threshold_daily
        
        # In-memory fallback (if no Redis)
        self._hourly_counts: dict = {}
        self._daily_counts: dict = {}
    
    def is_allowed(
        self,
        tenant_id: str,
        amount: int = 1
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Check if SMS is allowed for tenant.
        
        Args:
            tenant_id: Tenant identifier
            amount: Number of SMS to send (default: 1)
            
        Returns:
            Tuple of (is_allowed, reason_if_not_allowed, remaining_count)
        """
        if self.redis_client:
            return self._check_redis(tenant_id, amount)
        else:
            return self._check_local(tenant_id, amount)
    
    def _check_redis(
        self,
        tenant_id: str,
        amount: int
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """Check SMS limits using Redis"""
        try:
            import time
            
            current_time = time.time()
            hour_key = f"sms_limit:hourly:{tenant_id}"
            day_key = f"sms_limit:daily:{tenant_id}"
            
            # Check hourly limit
            hourly_count = self.redis_client.get(hour_key)
            hourly_count = int(hourly_count) if hourly_count else 0
            
            if hourly_count + amount > self.max_sms_per_hour:
                remaining = max(0, self.max_sms_per_hour - hourly_count)
                return False, "hourly_limit_exceeded", remaining
            
            # Check daily limit
            daily_count = self.redis_client.get(day_key)
            daily_count = int(daily_count) if daily_count else 0
            
            if daily_count + amount > self.max_sms_per_day:
                remaining = max(0, self.max_sms_per_day - daily_count)
                return False, "daily_limit_exceeded", remaining
            
            # Increment counts
            pipe = self.redis_client.pipeline()
            pipe.incrby(hour_key, amount)
            pipe.expire(hour_key, 3600)  # 1 hour TTL
            pipe.incrby(day_key, amount)
            pipe.expire(day_key, 86400)  # 24 hour TTL
            pipe.execute()
            
            hourly_remaining = self.max_sms_per_hour - (hourly_count + amount)
            daily_remaining = self.max_sms_per_day - (daily_count + amount)
            
            # Log warning if approaching limits
            if hourly_count + amount >= self.max_sms_per_hour * self.warning_threshold_hourly:
                logger.warning(
                    f"SMS hourly limit approaching",
                    extra={
                        'tenant_id': tenant_id,
                        'hourly_count': hourly_count + amount,
                        'hourly_limit': self.max_sms_per_hour
                    }
                )
            
            if daily_count + amount >= self.max_sms_per_day * self.warning_threshold_daily:
                logger.warning(
                    f"SMS daily limit approaching",
                    extra={
                        'tenant_id': tenant_id,
                        'daily_count': daily_count + amount,
                        'daily_limit': self.max_sms_per_day
                    }
                )
            
            return True, None, min(hourly_remaining, daily_remaining)
            
        except Exception as e:
            logger.error(f"Redis SMS rate limit check failed: {e}", exc_info=True)
            # Fallback to local (allow if Redis fails)
            return self._check_local(tenant_id, amount)
    
    def _check_local(
        self,
        tenant_id: str,
        amount: int
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """Check SMS limits using local memory (fallback)"""
        import time
        from collections import defaultdict
        
        current_time = time.time()
        
        # Initialize if needed
        if tenant_id not in self._hourly_counts:
            self._hourly_counts[tenant_id] = []
        if tenant_id not in self._daily_counts:
            self._daily_counts[tenant_id] = []
        
        # Clean old entries
        hour_ago = current_time - 3600
        day_ago = current_time - 86400
        
        self._hourly_counts[tenant_id] = [
            t for t in self._hourly_counts[tenant_id] if t >= hour_ago
        ]
        self._daily_counts[tenant_id] = [
            t for t in self._daily_counts[tenant_id] if t >= day_ago
        ]
        
        hourly_count = len(self._hourly_counts[tenant_id])
        daily_count = len(self._daily_counts[tenant_id])
        
        # Check limits
        if hourly_count + amount > self.max_sms_per_hour:
            remaining = max(0, self.max_sms_per_hour - hourly_count)
            return False, "hourly_limit_exceeded", remaining
        
        if daily_count + amount > self.max_sms_per_day:
            remaining = max(0, self.max_sms_per_day - daily_count)
            return False, "daily_limit_exceeded", remaining
        
        # Add requests
        for _ in range(amount):
            self._hourly_counts[tenant_id].append(current_time)
            self._daily_counts[tenant_id].append(current_time)
        
        hourly_remaining = self.max_sms_per_hour - (hourly_count + amount)
        daily_remaining = self.max_sms_per_day - (daily_count + amount)
        
        return True, None, min(hourly_remaining, daily_remaining)
    
    @classmethod
    def from_env(cls, redis_client: Optional[Redis]) -> 'SMSRateLimiter':
        """Create rate limiter from environment variables"""
        return cls(
            redis_client=redis_client,
            max_sms_per_hour=int(os.getenv('SMS_CAP_HOURLY', '100')),
            max_sms_per_day=int(os.getenv('SMS_CAP_DAILY', '1000')),
            warning_threshold_hourly=float(os.getenv('SMS_CAP_WARNING_HOURLY', '0.8')),
            warning_threshold_daily=float(os.getenv('SMS_CAP_WARNING_DAILY', '0.8'))
        )

