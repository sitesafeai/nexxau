"""
Detection Processor - Runs YOLO inference on frames
"""
import os
import logging
import time
from typing import Dict, List, Optional, Tuple
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class DetectionProcessor:
    """
    Processes frames through YOLO inference.
    
    Attaches model metadata to all detection results for compliance and audit trails.
    """
    
    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.is_gpu = model_manager.is_gpu()
        self.max_fps_cpu = 1.0  # CPU mode: max 1 FPS per camera
        self.last_process_time: Dict[str, float] = {}  # camera_id -> last process timestamp
        # Get model metadata once at initialization (immutable for all detections)
        self.model_metadata = model_manager.get_model_metadata()
    
    def process_frame(
        self,
        frame_path: str,
        camera_id: str,
        tenant_id: str,
        sequence: int,
        timestamp: str
    ) -> Optional[Dict]:
        """
        Process a single frame through YOLO
        
        Args:
            frame_path: Path to JPEG frame file
            camera_id: Camera ID
            tenant_id: Tenant ID
            sequence: Frame sequence number
            timestamp: Frame timestamp (ISO 8601)
            
        Returns:
            Detection result dictionary or None if processing failed/skipped
        """
        start_time = time.time()
        
        # CPU mode: Rate limiting (max 1 FPS per camera)
        if not self.is_gpu:
            current_time = time.time()
            last_time = self.last_process_time.get(camera_id, 0)
            elapsed = current_time - last_time
            
            if elapsed < 1.0 / self.max_fps_cpu:
                # Skip this frame (rate limiting)
                logger.debug(
                    f"Skipping frame (CPU rate limit): {camera_id}, "
                    f"elapsed: {elapsed:.3f}s"
                )
                return None
            
            self.last_process_time[camera_id] = current_time
        
        # Load image
        try:
            image = Image.open(frame_path)
            image_array = np.array(image)
        except Exception as e:
            logger.error(f"Failed to load image {frame_path}: {e}", exc_info=True)
            return None
        
        # Run inference
        try:
            # CPU mode: batch_size=1 (sequential processing)
            # GPU mode: batch_size=1 for single frame (batching handled by batch collector)
            batch_size = 1
            results = self.model_manager.predict(image_array, batch_size=batch_size, verbose=False)
            
            # Process results (YOLO returns Results object or list)
            if isinstance(results, list) and len(results) > 0:
                result = results[0]
            else:
                result = results
            
            # Parse detections
            detections = self._parse_detections(result)
            
            # Build raw detection result (no PPE policy logic - rule-agnostic)
            # PPE compliance evaluation is handled by separate PPE Policy service
            detection_result = {
                'cameraId': camera_id,
                'tenantId': tenant_id,
                'timestamp': timestamp,
                'sequence': sequence,
                'people_count': self._count_people(detections),
                'detections': detections,  # Raw detections only: objects, bboxes, confidence
                'inference_latency_ms': (time.time() - start_time) * 1000,
                'model': self.model_metadata.copy(),  # Include model metadata for audit trail
            }
            
            logger.debug(
                f"Processed frame: {camera_id}, "
                f"people: {detection_result['people_count']}, "
                f"latency: {detection_result['inference_latency_ms']:.2f}ms"
            )
            
            return detection_result
            
        except Exception as e:
            logger.error(f"Inference failed for {frame_path}: {e}", exc_info=True)
            return None
    
    def process_batch(
        self,
        frame_data_list: List[Dict],
        batch_size: Optional[int] = None
    ) -> List[Optional[Dict]]:
        """
        Process a batch of frames (GPU mode only)
        
        BATCH PROCESSING CONTRACT:
        - GPU mode: Processes all frames in batch simultaneously
        - CPU mode: MUST NOT call this method (use process_frame instead)
        - Batch size is determined by collector, not per-call
        
        Args:
            frame_data_list: List of frame data dictionaries with keys:
                - frame_path: Path to JPEG frame file
                - camera_id: Camera ID
                - tenant_id: Tenant ID
                - sequence: Frame sequence number
                - timestamp: Frame timestamp (ISO 8601)
            batch_size: Optional batch size override (uses len(frame_data_list) if not provided)
            
        Returns:
            List of detection results (None for failed frames)
        """
        if not self.is_gpu:
            # CPU mode: process sequentially (should not be called in CPU mode)
            logger.warning("process_batch called in CPU mode, processing sequentially")
            return [
                self.process_frame(
                    frame_data['frame_path'],
                    frame_data['camera_id'],
                    frame_data['tenant_id'],
                    frame_data['sequence'],
                    frame_data['timestamp']
                )
                for frame_data in frame_data_list
            ]
        
        start_time = time.time()
        batch_size = batch_size or len(frame_data_list)
        camera_ids = [fd.get('camera_id') for fd in frame_data_list]
        
        # Load all images
        images = []
        for frame_data in frame_data_list:
            frame_path = frame_data['frame_path']
            try:
                image = Image.open(frame_path)
                images.append(np.array(image))
            except Exception as e:
                logger.error(f"Failed to load image {frame_path}: {e}", exc_info=True)
                images.append(None)
        
        # Run batch inference
        try:
            valid_images = [img for img in images if img is not None]
            if not valid_images:
                logger.warning("No valid images in batch")
                return [None] * len(frame_data_list)
            
            # Run inference with configured batch size
            results = self.model_manager.predict(
                valid_images,
                batch_size=min(batch_size, len(valid_images)),
                verbose=False
            )
            
            # Process results
            detection_results = []
            result_idx = 0
            for i, frame_data in enumerate(frame_data_list):
                if images[i] is None:
                    detection_results.append(None)
                    continue
                
                # Get result for this frame
                if isinstance(results, list):
                    result = results[result_idx] if result_idx < len(results) else results[0]
                else:
                    result = results
                result_idx += 1
                
                # Parse detections
                detections = self._parse_detections(result)
                
                # Build detection result with model metadata for compliance/audit
                batch_latency_ms = (time.time() - start_time) * 1000
                # Build raw detection result (no PPE policy logic - rule-agnostic)
                # PPE compliance evaluation is handled by separate PPE Policy service
                detection_result = {
                    'cameraId': frame_data['camera_id'],
                    'tenantId': frame_data['tenant_id'],
                    'timestamp': frame_data['timestamp'],
                    'sequence': frame_data['sequence'],
                    'people_count': self._count_people(detections),
                    'detections': detections,  # Raw detections only: objects, bboxes, confidence
                    'inference_latency_ms': batch_latency_ms / len(valid_images),  # Per-frame latency
                    'model': self.model_metadata.copy(),  # Include model metadata for audit trail
                }
                
                detection_results.append(detection_result)
            
            # Log batch execution
            total_latency_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Batch inference completed",
                extra={
                    'event': 'batch_inference_completed',
                    'batch_size': len(frame_data_list),
                    'batch_latency_ms': round(total_latency_ms, 2),
                    'per_frame_latency_ms': round(total_latency_ms / len(valid_images), 2),
                    'camera_ids': camera_ids,
                    'device': 'gpu',
                }
            )
            
            return detection_results
            
        except Exception as e:
            logger.error(
                f"Batch inference failed",
                extra={
                    'event': 'batch_inference_failed',
                    'batch_size': len(frame_data_list),
                    'camera_ids': camera_ids,
                    'error': str(e),
                },
                exc_info=True
            )
            return [None] * len(frame_data_list)
    
    def _parse_detections(self, result) -> List[Dict]:
        """Parse YOLO results into detection dictionaries"""
        detections = []
        
        try:
            # YOLO Results object has boxes attribute
            if hasattr(result, 'boxes'):
                boxes = result.boxes
                for i in range(len(boxes)):
                    cls = int(boxes.cls[i].item())
                    conf = float(boxes.conf[i].item())
                    xyxy = boxes.xyxy[i].cpu().numpy().tolist()  # [x1, y1, x2, y2]
                    
                    # Get class name
                    class_name = result.names.get(cls, f"class_{cls}")
                    
                    detections.append({
                        'class': class_name,
                        'confidence': round(conf, 4),
                        'bbox': [round(coord, 2) for coord in xyxy],
                    })
        except Exception as e:
            logger.error(f"Error parsing detections: {e}", exc_info=True)
        
        return detections
    
    def _count_people(self, detections: List[Dict]) -> int:
        """
        Count number of people detected (raw statistic, no policy logic).
        
        This is a simple count for metrics/analytics purposes only.
        PPE compliance evaluation is handled by the separate PPE Policy service.
        """
        person_classes = ['person', 'people']  # YOLO person class
        return sum(1 for d in detections if d.get('class', '').lower() in person_classes)
