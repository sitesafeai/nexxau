"""
Storage Limit Manager

Manages snapshot storage limits and disables snapshots when limit exceeded.
"""
import os
import logging
import time
from typing import Optional
from dataclasses import dataclass
from .s3_storage import S3Storage

logger = logging.getLogger(__name__)


@dataclass
class StorageLimitConfig:
    """Storage limit configuration"""
    max_storage_bytes: Optional[int] = None  # None = unlimited
    warning_threshold: float = 0.8  # Warn at 80% of limit
    disable_threshold: float = 0.95  # Disable at 95% of limit
    check_interval_seconds: float = 300.0  # Check every 5 minutes


class StorageLimitManager:
    """
    Manages storage limits for snapshots.
    
    Disables snapshot capture when storage limit is exceeded.
    """
    
    def __init__(
        self,
        s3_storage: S3Storage,
        config: Optional[StorageLimitConfig] = None
    ):
        """
        Initialize storage limit manager.
        
        Args:
            s3_storage: S3 storage client for checking storage usage
            config: Configuration (uses defaults if None)
        """
        self.s3_storage = s3_storage
        self.config = config or StorageLimitConfig(
            max_storage_bytes=int(os.getenv('SNAPSHOT_STORAGE_MAX_BYTES', '0')) or None,
            warning_threshold=float(os.getenv('SNAPSHOT_STORAGE_WARNING', '0.8')),
            disable_threshold=float(os.getenv('SNAPSHOT_STORAGE_DISABLE', '0.95')),
            check_interval_seconds=float(os.getenv('SNAPSHOT_STORAGE_CHECK_INTERVAL', '300.0'))
        )
        
        self._snapshots_disabled = False
        self._last_check_time: Optional[float] = None
        self._last_storage_usage: Optional[int] = None
        self._last_usage_percentage: Optional[float] = None
    
    def is_snapshot_allowed(self) -> bool:
        """
        Check if snapshot capture is allowed.
        
        Returns:
            True if snapshots are allowed, False if disabled due to storage limit
        """
        # If no limit configured, always allow
        if self.config.max_storage_bytes is None:
            return True
        
        # Check storage usage (with caching)
        if self._should_check_storage():
            self._check_storage_usage()
        
        return not self._snapshots_disabled
    
    def _should_check_storage(self) -> bool:
        """Check if storage should be checked (based on interval)"""
        if self._last_check_time is None:
            return True
        
        elapsed = time.time() - self._last_check_time
        return elapsed >= self.config.check_interval_seconds
    
    def _check_storage_usage(self) -> None:
        """Check current storage usage and update disabled state"""
        try:
            # Get storage usage from S3
            # This is a placeholder - actual implementation depends on S3 storage
            # For now, we'll use a simple approach: list objects and sum sizes
            
            storage_usage = self._get_storage_usage()
            self._last_storage_usage = storage_usage
            self._last_check_time = time.time()
            
            if self.config.max_storage_bytes is None:
                return
            
            usage_percentage = storage_usage / self.config.max_storage_bytes
            self._last_usage_percentage = usage_percentage
            
            # Check if should disable
            if usage_percentage >= self.config.disable_threshold:
                if not self._snapshots_disabled:
                    logger.error(
                        f"Snapshots disabled due to storage limit exceeded",
                        extra={
                            'storage_usage': storage_usage,
                            'storage_limit': self.config.max_storage_bytes,
                            'usage_percentage': usage_percentage
                        }
                    )
                self._snapshots_disabled = True
            elif usage_percentage >= self.config.warning_threshold:
                logger.warning(
                    f"Storage limit warning",
                    extra={
                        'storage_usage': storage_usage,
                        'storage_limit': self.config.max_storage_bytes,
                        'usage_percentage': usage_percentage
                    }
                )
                # Re-enable if previously disabled but now below disable threshold
                if self._snapshots_disabled:
                    logger.info("Snapshots re-enabled (storage usage decreased)")
                    self._snapshots_disabled = False
            else:
                # Below warning threshold, ensure enabled
                if self._snapshots_disabled:
                    logger.info("Snapshots re-enabled (storage usage decreased)")
                    self._snapshots_disabled = False
            
        except Exception as e:
            logger.error(
                f"Failed to check storage usage: {e}",
                exc_info=True
            )
            # On error, allow snapshots (fail open)
            # This prevents false positives from storage check failures
    
    def _get_storage_usage(self) -> int:
        """
        Get current storage usage in bytes.
        
        This is a placeholder - actual implementation should query S3.
        """
        try:
            # Placeholder: In production, this should:
            # 1. List all objects in snapshot bucket
            # 2. Sum object sizes
            # 3. Return total size in bytes
            
            # For now, return 0 (unlimited)
            # TODO: Implement actual S3 storage usage query
            return 0
        except Exception as e:
            logger.error(f"Failed to get storage usage: {e}", exc_info=True)
            return 0
    
    def get_storage_status(self) -> dict:
        """Get current storage status"""
        if self.config.max_storage_bytes is None:
            return {
                'limit_configured': False,
                'snapshots_enabled': True,
                'storage_usage': self._last_storage_usage,
                'usage_percentage': None
            }
        
        return {
            'limit_configured': True,
            'snapshots_enabled': not self._snapshots_disabled,
            'storage_limit_bytes': self.config.max_storage_bytes,
            'storage_usage': self._last_storage_usage,
            'usage_percentage': self._last_usage_percentage,
            'warning_threshold': self.config.warning_threshold,
            'disable_threshold': self.config.disable_threshold
        }
    
    def force_check(self) -> None:
        """Force immediate storage check (for testing/admin)"""
        self._last_check_time = None
        self._check_storage_usage()

