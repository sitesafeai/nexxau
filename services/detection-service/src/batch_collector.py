"""
Batch Collector for GPU Mode
Handles frame batching with fairness and latency guarantees
"""
import os
import time
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class BatchCollector:
    """
    Collects frames for GPU batch processing with strict guarantees:
    
    BATCHING CONTRACT:
    1. Fairness: Max 1 frame per camera per batch (no camera domination)
    2. Latency Safety: Oldest frame age tracked, batch flushed when threshold exceeded
    3. Size Limit: Batch flushed when max_batch_size reached
    4. Deterministic: Batch flush triggers are well-defined and auditable
    
    BATCH FLUSH CONDITIONS (OR):
    - Batch size reaches GPU_MAX_BATCH_SIZE
    - Oldest frame age exceeds GPU_MAX_BATCH_LATENCY_MS
    
    CPU MODE:
    - Batch collector is NOT used in CPU mode
    - CPU mode processes frames sequentially (no batching)
    """
    
    def __init__(self, max_batch_size: int = 4, max_latency_ms: int = 50):
        """
        Initialize batch collector
        
        Args:
            max_batch_size: Maximum frames per batch (default: 4)
            max_latency_ms: Maximum latency for oldest frame in batch (default: 50ms)
        """
        self.max_batch_size = max_batch_size
        self.max_latency_ms = max_latency_ms
        self.batch: List[Tuple[Dict, float]] = []  # List of (frame_data, added_timestamp_ms)
        self.cameras_in_batch: set = set()  # Track cameras already in current batch (fairness)
    
    def add_frame(self, frame_data: Dict) -> bool:
        """
        Attempt to add a frame to the current batch
        
        FAIRNESS ENFORCEMENT:
        - Returns False if camera already has a frame in current batch
        - Ensures max 1 frame per camera per batch
        
        Args:
            frame_data: Frame data dictionary with keys:
                - frame_path: Path to frame file
                - camera_id: Camera ID
                - tenant_id: Tenant ID
                - sequence: Frame sequence number
                - timestamp: Frame timestamp (ISO 8601)
        
        Returns:
            True if frame was added, False if rejected (camera already in batch)
        """
        camera_id = frame_data.get('camera_id')
        
        # Fairness check: reject if camera already in batch
        if camera_id in self.cameras_in_batch:
            logger.debug(
                f"Frame rejected from batch (camera already present): {camera_id}",
                extra={
                    'event': 'batch_frame_rejected',
                    'camera_id': camera_id,
                    'batch_size': len(self.batch),
                    'reason': 'camera_already_in_batch',
                }
            )
            return False
        
        # Add frame to batch with timestamp (milliseconds)
        current_time_ms = time.time() * 1000
        self.batch.append((frame_data, current_time_ms))
        self.cameras_in_batch.add(camera_id)
        
        logger.debug(
            f"Frame added to batch",
            extra={
                'event': 'batch_frame_added',
                'camera_id': camera_id,
                'batch_size': len(self.batch),
                'batch_capacity': self.max_batch_size,
            }
        )
        
        return True
    
    def should_flush(self) -> bool:
        """
        Determine if batch should be flushed
        
        FLUSH CONDITIONS (OR):
        1. Batch size reached GPU_MAX_BATCH_SIZE
        2. Oldest frame age exceeds GPU_MAX_BATCH_LATENCY_MS
        
        This ensures:
        - High throughput: batches fill to max size under load
        - Low latency: batches flush before latency threshold even if not full
        - Deterministic behavior: flush conditions are clear and auditable
        
        Returns:
            True if batch should be flushed, False otherwise
        """
        # Condition 1: Batch size reached
        if len(self.batch) >= self.max_batch_size:
            return True
        
        # Condition 2: Latency threshold exceeded (oldest frame)
        if self.batch:
            oldest_timestamp_ms = self.batch[0][1]
            current_time_ms = time.time() * 1000
            oldest_age_ms = current_time_ms - oldest_timestamp_ms
            
            if oldest_age_ms >= self.max_latency_ms:
                return True
        
        return False
    
    def flush(self) -> List[Dict]:
        """
        Flush current batch and return frame data
        
        Returns:
            List of frame data dictionaries
        """
        frame_data_list = [frame_data for frame_data, _ in self.batch]
        
        # Calculate batch metrics
        batch_size = len(self.batch)
        batch_latency_ms = 0.0
        if self.batch:
            oldest_timestamp_ms = self.batch[0][1]
            newest_timestamp_ms = self.batch[-1][1]
            current_time_ms = time.time() * 1000
            batch_latency_ms = current_time_ms - oldest_timestamp_ms
            batch_age_range_ms = newest_timestamp_ms - oldest_timestamp_ms
        else:
            batch_age_range_ms = 0.0
        
        # Reset batch state
        cameras_in_batch = list(self.cameras_in_batch)
        self.batch = []
        self.cameras_in_batch = set()
        
        logger.info(
            f"Batch flushed",
            extra={
                'event': 'batch_flushed',
                'batch_size': batch_size,
                'batch_latency_ms': round(batch_latency_ms, 2),
                'batch_age_range_ms': round(batch_age_range_ms, 2),
                'camera_ids': cameras_in_batch,
                'max_batch_size': self.max_batch_size,
                'max_latency_ms': self.max_latency_ms,
            }
        )
        
        return frame_data_list
    
    def get_current_batch_size(self) -> int:
        """Get current batch size"""
        return len(self.batch)
    
    def get_oldest_frame_age_ms(self) -> float:
        """Get age of oldest frame in batch (milliseconds)"""
        if not self.batch:
            return 0.0
        oldest_timestamp_ms = self.batch[0][1]
        current_time_ms = time.time() * 1000
        return current_time_ms - oldest_timestamp_ms
    
    def is_empty(self) -> bool:
        """Check if batch is empty"""
        return len(self.batch) == 0
