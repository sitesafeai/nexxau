"""
Rate Limiter

Rate limiting for alerts per camera and per user.
"""
import logging
import time
from typing import Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Rate limiter for alerts.
    
    Supports:
    - Per-camera rate limiting
    - Per-user rate limiting
    - Sliding window algorithm
    """
    
    def __init__(
        self,
        camera_limit_per_minute: int = 5,
        user_limit_per_minute: int = 10,
        window_seconds: int = 60
    ):
        """
        Initialize rate limiter.
        
        Args:
            camera_limit_per_minute: Max alerts per camera per minute (default: 5)
            user_limit_per_minute: Max alerts per user per minute (default: 10)
            window_seconds: Time window in seconds (default: 60)
        """
        self.camera_limit = camera_limit_per_minute
        self.user_limit = user_limit_per_minute
        self.window_seconds = window_seconds
        
        # Track alert timestamps per camera and per user
        # Format: {key: [timestamp1, timestamp2, ...]}
        self._camera_alerts: Dict[str, list] = defaultdict(list)
        self._user_alerts: Dict[str, list] = defaultdict(list)
        
        # Last cleanup time
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Cleanup every 5 minutes
    
    def check_rate_limit(
        self,
        camera_id: str,
        user_ids: Optional[list] = None
    ) -> tuple:
        """
        Check if alert should be rate-limited.
        
        Args:
            camera_id: Camera identifier
            user_ids: List of user IDs receiving the alert (optional)
            
        Returns:
            Tuple of (allowed: bool, reason: Optional[str])
            - allowed: True if alert should be sent, False if rate-limited
            - reason: Reason for rate limiting (if any)
        """
        current_time = time.time()
        
        # Periodic cleanup of old entries
        if current_time - self._last_cleanup > self._cleanup_interval:
            self._cleanup_old_entries(current_time)
            self._last_cleanup = current_time
        
        # Check camera rate limit
        camera_key = camera_id
        camera_allowed, camera_reason = self._check_limit(
            self._camera_alerts,
            camera_key,
            self.camera_limit,
            current_time
        )
        
        if not camera_allowed:
            logger.debug(
                f"Rate limit exceeded for camera",
                extra={
                    'camera_id': camera_id,
                    'limit': self.camera_limit,
                    'reason': camera_reason,
                }
            )
            return False, f"camera_limit_exceeded: {camera_reason}"
        
        # Check user rate limits
        if user_ids:
            for user_id in user_ids:
                user_key = str(user_id)
                user_allowed, user_reason = self._check_limit(
                    self._user_alerts,
                    user_key,
                    self.user_limit,
                    current_time
                )
                
                if not user_allowed:
                    logger.debug(
                        f"Rate limit exceeded for user",
                        extra={
                            'user_id': user_id,
                            'limit': self.user_limit,
                            'reason': user_reason,
                        }
                    )
                    return False, f"user_limit_exceeded: {user_id}: {user_reason}"
        
        return True, None
    
    def record_alert(
        self,
        camera_id: str,
        user_ids: Optional[list] = None
    ) -> None:
        """
        Record that an alert was sent (for rate limiting tracking).
        
        Args:
            camera_id: Camera identifier
            user_ids: List of user IDs who received the alert (optional)
        """
        current_time = time.time()
        
        # Record camera alert
        camera_key = camera_id
        self._camera_alerts[camera_key].append(current_time)
        
        # Record user alerts
        if user_ids:
            for user_id in user_ids:
                user_key = str(user_id)
                self._user_alerts[user_key].append(current_time)
    
    def _check_limit(
        self,
        alerts_dict: Dict[str, list],
        key: str,
        limit: int,
        current_time: float
    ) -> tuple:
        """
        Check if rate limit is exceeded for a key.
        
        Args:
            alerts_dict: Dictionary of alert timestamps
            key: Key to check (camera_id or user_id)
            limit: Maximum number of alerts allowed
            current_time: Current timestamp
            
        Returns:
            Tuple of (allowed: bool, reason: Optional[str])
        """
        window_start = current_time - self.window_seconds
        
        # Get alerts within the time window
        alert_timestamps = alerts_dict.get(key, [])
        recent_alerts = [ts for ts in alert_timestamps if ts > window_start]
        
        # Update dictionary with filtered alerts
        alerts_dict[key] = recent_alerts
        
        # Check limit
        if len(recent_alerts) >= limit:
            return False, f"{len(recent_alerts)} alerts in last {self.window_seconds}s (limit: {limit})"
        
        return True, None
    
    def _cleanup_old_entries(self, current_time: float) -> None:
        """Clean up old entries outside the time window"""
        window_start = current_time - self.window_seconds
        
        # Clean camera alerts
        keys_to_remove = []
        for key, timestamps in self._camera_alerts.items():
            recent = [ts for ts in timestamps if ts > window_start]
            if recent:
                self._camera_alerts[key] = recent
            else:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._camera_alerts[key]
        
        # Clean user alerts
        keys_to_remove = []
        for key, timestamps in self._user_alerts.items():
            recent = [ts for ts in timestamps if ts > window_start]
            if recent:
                self._user_alerts[key] = recent
            else:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._user_alerts[key]
        
        logger.debug(
            f"Cleaned up rate limiter entries",
            extra={
                'camera_entries': len(self._camera_alerts),
                'user_entries': len(self._user_alerts),
            }
        )

