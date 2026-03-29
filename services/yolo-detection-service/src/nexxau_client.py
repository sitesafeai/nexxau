"""
Client for sending detections to Nexxau API.

Sends detection results to POST /api/yolo/detections endpoint.
Payload format matches app/app/lib/safety/frame-validator.ts requirements.
"""

import logging
import requests
from typing import List, Dict, Optional
import base64
import cv2
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)


class NexxauClient:
    """
    Client for posting detection results to Nexxau API.
    
    Implements section 2.5 of the plan:
    - POST /api/yolo/detections
    - Payload matches frame-validator.ts: camera_id, timestamp, detections, frame_data, frame_width, frame_height
    - Detection format: { class_name, confidence, bbox }
    """
    
    def __init__(self, api_url: str, timeout: int = 10):
        self.api_url = api_url.rstrip('/')
        self.detections_endpoint = f"{self.api_url}/api/yolo/detections"
        self.timeout = timeout
        
        logger.info(f"NexxauClient initialized. Endpoint: {self.detections_endpoint}")
    
    def send_detection(
        self,
        camera_id: str,
        detections: List[Dict],
        frame: np.ndarray,
        include_frame: bool = True,
    ) -> bool:
        """
        Send detection results to Nexxau API.
        
        Args:
            camera_id: Camera identifier
            detections: List of detections from YOLO
            frame: Original frame (numpy array)
            include_frame: Whether to include base64-encoded frame in payload
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Prepare frame data
            frame_data = None
            if include_frame and frame is not None:
                # Encode frame as JPEG
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                frame_data = base64.b64encode(buffer).decode('utf-8')
            
            # Get frame dimensions
            frame_height, frame_width = frame.shape[:2] if frame is not None else (0, 0)
            
            # Prepare payload matching frame-validator.ts
            payload = {
                "camera_id": camera_id,
                "timestamp": datetime.now().isoformat(),
                "detections": detections,
                "frame_data": frame_data,
                "frame_width": frame_width,
                "frame_height": frame_height,
            }
            
            # Send POST request
            response = requests.post(
                self.detections_endpoint,
                json=payload,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )
            
            if response.status_code == 200:
                logger.debug(
                    f"[{camera_id}] Detection sent successfully. "
                    f"{len(detections)} objects detected."
                )
                return True
            else:
                logger.warning(
                    f"[{camera_id}] Failed to send detection. "
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
                
        except requests.exceptions.Timeout:
            logger.error(f"[{camera_id}] Timeout sending detection to Nexxau API")
            return False
        except requests.exceptions.ConnectionError:
            logger.error(f"[{camera_id}] Connection error sending detection to Nexxau API")
            return False
        except Exception as e:
            logger.error(f"[{camera_id}] Exception sending detection: {e}")
            return False
    
    def health_check(self) -> bool:
        """
        Check if Nexxau API is reachable.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            # Try to reach the API (could use a dedicated health endpoint if available)
            response = requests.get(
                f"{self.api_url}/api/health",
                timeout=5,
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Nexxau API health check failed: {e}")
            return False
