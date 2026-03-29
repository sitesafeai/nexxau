"""
Hardened RTSP stream reader with reconnect logic and metrics.

This is the highest-risk component. OpenCV RTSP is fragile under network jitter.
Construction-site WiFi will cause drops. This module implements:
- TCP transport
- Timeouts
- Reconnect logic on failed reads
- Stale frame detection
- Comprehensive metrics for observability
"""

import cv2
import os
import time
import logging
from typing import Optional, Tuple
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)


class StreamMetrics:
    """Metrics tracked per stream for health monitoring."""
    
    def __init__(self):
        self.reconnect_count = 0
        self.dropped_frame_count = 0
        self.last_successful_frame_timestamp: Optional[datetime] = None
        self.consecutive_failures = 0
        self.total_frames_read = 0
        self.total_failed_reads = 0
    
    def to_dict(self):
        return {
            "reconnect_count": self.reconnect_count,
            "dropped_frame_count": self.dropped_frame_count,
            "last_successful_frame_timestamp": self.last_successful_frame_timestamp.isoformat() if self.last_successful_frame_timestamp else None,
            "consecutive_failures": self.consecutive_failures,
            "total_frames_read": self.total_frames_read,
            "total_failed_reads": self.total_failed_reads,
        }


class HardenedStreamReader:
    """
    Hardened RTSP stream reader with automatic reconnection.
    
    Implements all measures from plan section 2.2:
    - TCP transport
    - Buffer size = 1
    - Open/read timeouts
    - Reconnect logic on N consecutive failures
    - Stale frame detection (>15s no frame)
    """
    
    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        max_consecutive_failures: int = 30,
        reconnect_delay_sec: int = 5,
        stale_frame_threshold_sec: int = 15,
    ):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.max_consecutive_failures = max_consecutive_failures
        self.reconnect_delay_sec = reconnect_delay_sec
        self.stale_frame_threshold_sec = stale_frame_threshold_sec
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.metrics = StreamMetrics()
        self._is_connected = False
        
        # Set OpenCV FFmpeg options for TCP transport BEFORE creating VideoCapture
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        
        logger.info(f"[{camera_id}] HardenedStreamReader initialized for {rtsp_url}")
    
    def connect(self) -> bool:
        """
        Establish connection to RTSP stream with hardened settings.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info(f"[{self.camera_id}] Connecting to RTSP stream...")
            
            # Release existing connection if any
            if self.cap is not None:
                self.cap.release()
                self.cap = None
            
            # Create VideoCapture with FFmpeg backend
            self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            
            if not self.cap.isOpened():
                logger.error(f"[{self.camera_id}] Failed to open RTSP stream")
                return False
            
            # Set buffer size to 1 (minimize latency)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Set timeouts (OpenCV 4.8+)
            # Open timeout: 10 seconds
            # Read timeout: 5 seconds
            try:
                self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
                self.cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
            except Exception as e:
                logger.warning(f"[{self.camera_id}] Could not set timeouts (OpenCV 4.8+ required): {e}")
            
            # Test read to verify connection
            ret, _ = self.cap.read()
            if not ret:
                logger.error(f"[{self.camera_id}] Test read failed after opening stream")
                self.cap.release()
                self.cap = None
                return False
            
            self._is_connected = True
            self.metrics.consecutive_failures = 0
            logger.info(f"[{self.camera_id}] Successfully connected to RTSP stream")
            return True
            
        except Exception as e:
            logger.error(f"[{self.camera_id}] Exception during connection: {e}")
            if self.cap is not None:
                self.cap.release()
                self.cap = None
            return False
    
    def reconnect(self) -> bool:
        """
        Reconnect to RTSP stream after failure.
        
        Returns:
            True if reconnection successful, False otherwise
        """
        logger.warning(f"[{self.camera_id}] Attempting reconnect (count: {self.metrics.reconnect_count + 1})")
        
        self._is_connected = False
        self.metrics.reconnect_count += 1
        
        # Sleep before reconnect to avoid hammering the camera
        time.sleep(self.reconnect_delay_sec)
        
        return self.connect()
    
    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """
        Read a frame from the stream with automatic reconnection on failure.
        
        Implements reconnect logic:
        - On N consecutive failed reads → reconnect
        - On stale frame (>15s no frame) → reconnect
        
        Returns:
            Tuple of (success, frame)
            - success: True if frame read successfully
            - frame: numpy array or None
        """
        # Check if we need to connect initially
        if not self._is_connected or self.cap is None:
            if not self.connect():
                self.metrics.consecutive_failures += 1
                return False, None
        
        # Check for stale frame (no successful read in >15s)
        if self.metrics.last_successful_frame_timestamp is not None:
            time_since_last_frame = (datetime.now() - self.metrics.last_successful_frame_timestamp).total_seconds()
            if time_since_last_frame > self.stale_frame_threshold_sec:
                logger.warning(
                    f"[{self.camera_id}] Stale frame detected "
                    f"({time_since_last_frame:.1f}s since last frame). Forcing reconnect."
                )
                if not self.reconnect():
                    self.metrics.consecutive_failures += 1
                    return False, None
        
        # Attempt to read frame
        try:
            ret, frame = self.cap.read()
            
            if not ret or frame is None:
                # Failed read
                self.metrics.total_failed_reads += 1
                self.metrics.consecutive_failures += 1
                self.metrics.dropped_frame_count += 1
                
                logger.debug(
                    f"[{self.camera_id}] Failed to read frame "
                    f"(consecutive failures: {self.metrics.consecutive_failures})"
                )
                
                # Check if we've exceeded max consecutive failures
                if self.metrics.consecutive_failures >= self.max_consecutive_failures:
                    logger.error(
                        f"[{self.camera_id}] Max consecutive failures ({self.max_consecutive_failures}) "
                        f"reached. Attempting reconnect."
                    )
                    if not self.reconnect():
                        return False, None
                
                return False, None
            
            # Successful read
            self.metrics.total_frames_read += 1
            self.metrics.consecutive_failures = 0
            self.metrics.last_successful_frame_timestamp = datetime.now()
            
            return True, frame
            
        except Exception as e:
            logger.error(f"[{self.camera_id}] Exception during frame read: {e}")
            self.metrics.consecutive_failures += 1
            self.metrics.dropped_frame_count += 1
            
            # Attempt reconnect on exception
            if self.metrics.consecutive_failures >= self.max_consecutive_failures:
                self.reconnect()
            
            return False, None
    
    def get_metrics(self) -> StreamMetrics:
        """Get current metrics for health monitoring."""
        return self.metrics
    
    def get_status(self) -> str:
        """
        Get current status based on consecutive failures.
        
        Returns:
            "healthy", "degraded", or "unhealthy"
        """
        if self.metrics.consecutive_failures == 0:
            return "healthy"
        elif self.metrics.consecutive_failures < 3:
            return "healthy"  # Still recovering
        elif self.metrics.consecutive_failures < 10:
            return "degraded"  # 3+ failures
        else:
            return "unhealthy"  # 10+ failures
    
    def is_connected(self) -> bool:
        """Check if stream is currently connected."""
        return self._is_connected and self.cap is not None and self.cap.isOpened()
    
    def release(self):
        """Release the video capture resource."""
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        self._is_connected = False
        logger.info(f"[{self.camera_id}] Stream reader released")
