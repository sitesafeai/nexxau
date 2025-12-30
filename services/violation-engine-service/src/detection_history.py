"""
Detection History Tracker

Manages detection timestamps for sliding window evaluation.

Pure data structure with no I/O dependencies.
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict


class DetectionHistory:
    """
    Tracks detection timestamps per violation dedup key.
    
    Maintains sliding window of detections for state machine evaluation.
    """
    
    def __init__(self):
        # Map: dedup_key -> List[datetime] (sorted, most recent first)
        self._detections: Dict[str, List[datetime]] = defaultdict(list)
    
    def add_detection(self, dedup_key: str, timestamp: datetime) -> None:
        """
        Add detection timestamp for a dedup key.
        
        Timestamps are maintained in sorted order (most recent first).
        
        Args:
            dedup_key: Deduplication key
            timestamp: Detection timestamp
        """
        if not self._detections[dedup_key]:
            self._detections[dedup_key] = [timestamp]
        else:
            # Insert in sorted order (most recent first)
            detections = self._detections[dedup_key]
            # Find insertion point (binary search would be better for large lists)
            inserted = False
            for i, existing_ts in enumerate(detections):
                if timestamp >= existing_ts:
                    detections.insert(i, timestamp)
                    inserted = True
                    break
            if not inserted:
                detections.append(timestamp)
    
    def get_detections(self, dedup_key: str, limit: Optional[int] = None) -> List[datetime]:
        """
        Get detection timestamps for a dedup key.
        
        Args:
            dedup_key: Deduplication key
            limit: Optional limit on number of timestamps to return
            
        Returns:
            List of detection timestamps (sorted, most recent first)
        """
        detections = self._detections.get(dedup_key, [])
        if limit is not None:
            return detections[:limit]
        return detections.copy()
    
    def clear_detections(self, dedup_key: str) -> None:
        """
        Clear detection history for a dedup key.
        
        Args:
            dedup_key: Deduplication key
        """
        if dedup_key in self._detections:
            del self._detections[dedup_key]
    
    def cleanup_old_detections(
        self,
        dedup_key: str,
        cutoff_time: datetime,
        window_seconds: int
    ) -> None:
        """
        Remove detections older than cutoff (outside sliding window).
        
        Keeps detections within [cutoff_time - window_seconds, cutoff_time].
        
        Args:
            dedup_key: Deduplication key
            cutoff_time: Current time (window end)
            window_seconds: Window size in seconds
        """
        if dedup_key not in self._detections:
            return
        
        window_start = cutoff_time - timedelta(seconds=window_seconds)
        
        # Filter detections within window
        detections = self._detections[dedup_key]
        self._detections[dedup_key] = [
            ts for ts in detections
            if ts >= window_start
        ]
    
    def has_recent_detections(
        self,
        dedup_key: str,
        current_time: datetime,
        window_seconds: int
    ) -> bool:
        """
        Check if there are any detections within the sliding window.
        
        Args:
            dedup_key: Deduplication key
            current_time: Current timestamp
            window_seconds: Window size in seconds
            
        Returns:
            True if detections exist within window, False otherwise
        """
        detections = self.get_detections(dedup_key)
        if not detections:
            return False
        
        window_start = current_time - timedelta(seconds=window_seconds)
        return any(ts >= window_start for ts in detections)
    
    def clear_all(self) -> None:
        """Clear all detection history (for testing)"""
        self._detections.clear()
    
    def get_all_keys(self) -> List[str]:
        """Get all dedup keys with detection history"""
        return list(self._detections.keys())

