"""
GPU Saturation Handler

Handles frame dropping when GPU is saturated to prevent backlog buildup.
"""
import os
import logging
import random
from typing import Optional
from .redis_consumer import RedisConsumer

logger = logging.getLogger(__name__)


class GPUSaturationHandler:
    """
    Handles GPU saturation by dropping frames intelligently.
    
    Frame drop probability increases with GPU lag:
    - At 100 entries lag: 10% drop probability
    - At 500 entries lag: 50% drop probability
    - Maximum: 90% drop probability
    """
    
    def __init__(
        self,
        lag_threshold_warning: int = 100,
        lag_threshold_critical: int = 500,
        drop_probability_lag_100: float = 0.1,
        drop_probability_lag_500: float = 0.5,
        max_drop_probability: float = 0.9
    ):
        """
        Initialize GPU saturation handler.
        
        Args:
            lag_threshold_warning: Warning threshold for lag (entries)
            lag_threshold_critical: Critical threshold for lag (entries)
            drop_probability_lag_100: Drop probability at warning threshold
            drop_probability_lag_500: Drop probability at critical threshold
            max_drop_probability: Maximum drop probability (never exceed)
        """
        self.lag_threshold_warning = lag_threshold_warning
        self.lag_threshold_critical = lag_threshold_critical
        self.drop_probability_lag_100 = drop_probability_lag_100
        self.drop_probability_lag_500 = drop_probability_lag_500
        self.max_drop_probability = max_drop_probability
    
    def should_drop_frame(
        self,
        current_lag: int,
        device: str
    ) -> bool:
        """
        Determine if frame should be dropped based on GPU saturation.
        
        Args:
            current_lag: Current Redis stream lag (number of pending entries)
            device: Device type (cpu, cuda)
            
        Returns:
            True if frame should be dropped, False otherwise
        """
        # Only apply to GPU mode
        if device != "cuda":
            return False
        
        # Calculate drop probability based on lag
        drop_probability = self._calculate_drop_probability(current_lag)
        
        # Random drop decision
        should_drop = random.random() < drop_probability
        
        if should_drop:
            logger.warning(
                f"Frame dropped due to GPU saturation",
                extra={
                    'lag': current_lag,
                    'drop_probability': drop_probability,
                    'device': device
                }
            )
        
        return should_drop
    
    def _calculate_drop_probability(self, lag: int) -> float:
        """
        Calculate drop probability based on lag.
        
        Uses linear interpolation between thresholds.
        """
        if lag < self.lag_threshold_warning:
            # No dropping below warning threshold
            return 0.0
        
        if lag >= self.lag_threshold_critical:
            # At or above critical threshold, use critical drop probability
            # But cap at max_drop_probability
            return min(self.drop_probability_lag_500, self.max_drop_probability)
        
        # Linear interpolation between warning and critical thresholds
        lag_range = self.lag_threshold_critical - self.lag_threshold_warning
        lag_above_warning = lag - self.lag_threshold_warning
        
        # Interpolate drop probability
        progress = lag_above_warning / lag_range
        drop_probability = (
            self.drop_probability_lag_100 +
            (self.drop_probability_lag_500 - self.drop_probability_lag_100) * progress
        )
        
        # Cap at max_drop_probability
        return min(drop_probability, self.max_drop_probability)
    
    @classmethod
    def from_env(cls) -> 'GPUSaturationHandler':
        """Create handler from environment variables"""
        return cls(
            lag_threshold_warning=int(os.getenv('GPU_SATURATION_LAG_WARNING', '100')),
            lag_threshold_critical=int(os.getenv('GPU_SATURATION_LAG_CRITICAL', '500')),
            drop_probability_lag_100=float(os.getenv('GPU_SATURATION_DROP_PROB_100', '0.1')),
            drop_probability_lag_500=float(os.getenv('GPU_SATURATION_DROP_PROB_500', '0.5')),
            max_drop_probability=float(os.getenv('GPU_SATURATION_MAX_DROP', '0.9'))
        )

