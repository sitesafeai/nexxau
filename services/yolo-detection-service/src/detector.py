"""
YOLO detector with FPS limiting and inference metrics.

Implements time-based FPS limiting (not frame-skip) to prevent GPU overload
and ensure sustainable 24/7 operation.
"""

import time
import logging
from typing import List, Dict, Optional
import numpy as np
from ultralytics import YOLO
from datetime import datetime

logger = logging.getLogger(__name__)


class DetectionMetrics:
    """Metrics tracked per detector for health monitoring."""
    
    def __init__(self):
        self.total_inferences = 0
        self.total_inference_time_ms = 0.0
        self.last_inference_time_ms = 0.0
        self.actual_fps_achieved = 0.0
        self._inference_times_window: List[float] = []  # Rolling window for avg
        self._max_window_size = 100
        self._last_inference_timestamp: Optional[float] = None
    
    def record_inference(self, inference_time_ms: float):
        """Record an inference and update metrics."""
        self.total_inferences += 1
        self.last_inference_time_ms = inference_time_ms
        self.total_inference_time_ms += inference_time_ms
        
        # Update rolling window for avg
        self._inference_times_window.append(inference_time_ms)
        if len(self._inference_times_window) > self._max_window_size:
            self._inference_times_window.pop(0)
        
        # Update actual FPS achieved
        current_time = time.time()
        if self._last_inference_timestamp is not None:
            time_delta = current_time - self._last_inference_timestamp
            if time_delta > 0:
                self.actual_fps_achieved = 1.0 / time_delta
        self._last_inference_timestamp = current_time
    
    def get_avg_inference_time_ms(self) -> float:
        """Get average inference time over recent window."""
        if not self._inference_times_window:
            return 0.0
        return sum(self._inference_times_window) / len(self._inference_times_window)
    
    def to_dict(self):
        return {
            "total_inferences": self.total_inferences,
            "avg_inference_time_ms": round(self.get_avg_inference_time_ms(), 2),
            "last_inference_time_ms": round(self.last_inference_time_ms, 2),
            "actual_fps_achieved": round(self.actual_fps_achieved, 2),
        }


class YOLODetector:
    """
    YOLO detector with time-based FPS limiting.
    
    Implements section 2.3 of the plan:
    - Time-based limiting (not frame-skip)
    - Only infer when now - last_inference_time >= 1/target_fps
    - Configurable target FPS (default 3, max 5)
    """
    
    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        target_fps: float = 3.0,
        confidence_threshold: float = 0.5,
    ):
        self.target_fps = min(target_fps, 5.0)  # Max 5 FPS per plan
        self.confidence_threshold = confidence_threshold
        self.inference_interval = 1.0 / self.target_fps
        
        logger.info(f"Loading YOLO model: {model_path}")
        self.model = YOLO(model_path)
        logger.info(f"YOLO model loaded. Target FPS: {self.target_fps}, Interval: {self.inference_interval:.3f}s")
        
        self.metrics = DetectionMetrics()
        self._last_inference_time = 0.0
    
    def should_run_inference(self) -> bool:
        """
        Check if enough time has passed to run inference.
        
        Time-based limiting: only return True when
        now - last_inference_time >= 1/target_fps
        
        Returns:
            True if inference should run, False otherwise
        """
        current_time = time.time()
        time_since_last = current_time - self._last_inference_time
        return time_since_last >= self.inference_interval
    
    def detect(self, frame: np.ndarray) -> List[Dict]:
        """
        Run YOLO inference on a frame.
        
        Args:
            frame: Input frame (numpy array)
        
        Returns:
            List of detections, each with:
            - class_name: str
            - confidence: float
            - bbox: [x1, y1, x2, y2]
        """
        start_time = time.time()
        
        try:
            # Run YOLO inference
            results = self.model(frame, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                
                for i in range(len(boxes)):
                    # Extract box data
                    xyxy = boxes.xyxy[i].cpu().numpy()
                    conf = float(boxes.conf[i].cpu().numpy())
                    cls = int(boxes.cls[i].cpu().numpy())
                    
                    # Filter by confidence threshold
                    if conf < self.confidence_threshold:
                        continue
                    
                    # Get class name
                    class_name = self.model.names[cls]
                    
                    detections.append({
                        "class_name": class_name,
                        "confidence": conf,
                        "bbox": [float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])],
                    })
            
            # Record metrics
            inference_time_ms = (time.time() - start_time) * 1000
            self.metrics.record_inference(inference_time_ms)
            self._last_inference_time = time.time()
            
            return detections
            
        except Exception as e:
            logger.error(f"Error during YOLO inference: {e}")
            return []
    
    def get_metrics(self) -> DetectionMetrics:
        """Get current metrics for health monitoring."""
        return self.metrics
    
    def get_status(self) -> str:
        """
        Get detector status based on inference performance.
        
        Returns:
            "healthy", "degraded", or "unhealthy"
        """
        avg_time = self.metrics.get_avg_inference_time_ms()
        
        # Check for thermal throttling / GPU overload
        # If inference time > 500ms, something is wrong
        if avg_time > 500:
            return "unhealthy"
        elif avg_time > 300:
            return "degraded"
        else:
            return "healthy"
