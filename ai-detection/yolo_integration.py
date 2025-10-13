#!/usr/bin/env python3
"""
YOLO Integration with Nexxau Safety System
This script integrates your YOLO model with the Nexxau custom rules engine
"""

import cv2
import requests
import json
import time
from datetime import datetime
from ultralytics import YOLO
import numpy as np
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NexxauYOLOIntegration:
    def __init__(self, 
                 model_path: str = "yolov8n.pt",
                 nexxau_url: str = "http://localhost:3000",
                 camera_id: str = "camera-1",
                 confidence_threshold: float = 0.5):
        """
        Initialize YOLO integration with Nexxau
        
        Args:
            model_path: Path to YOLO model file
            nexxau_url: URL of Nexxau backend
            camera_id: Unique camera identifier
            confidence_threshold: Minimum confidence for detections
        """
        self.model_path = model_path
        self.nexxau_url = nexxau_url
        self.camera_id = camera_id
        self.confidence_threshold = confidence_threshold
        
        # Load YOLO model
        logger.info(f"Loading YOLO model from {model_path}")
        self.model = YOLO(model_path)
        
        # Detection endpoint
        self.detection_endpoint = f"{nexxau_url}/api/ai-detection"
        
        # PPE classes mapping (customize based on your model)
        self.ppe_classes = {
            'person': 'person',
            'helmet': 'helmet',
            'hardhat': 'helmet',  # Alternative name
            'vest': 'vest',
            'high_visibility_vest': 'vest',
            'gloves': 'gloves',
            'safety_gloves': 'gloves',
            'boots': 'boots',
            'safety_boots': 'boots',
            'goggles': 'goggles',
            'safety_goggles': 'goggles',
            'mask': 'mask',
            'safety_mask': 'mask'
        }
        
        logger.info("YOLO integration initialized successfully")

    def process_frame(self, frame: np.ndarray, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process a single frame and return detections
        
        Args:
            frame: Input frame (BGR format)
            metadata: Additional metadata about the frame
            
        Returns:
            Dictionary containing detection results
        """
        try:
            # Run YOLO detection
            results = self.model(frame, conf=self.confidence_threshold)
            
            detections = []
            for result in results:
                if result.boxes is not None:
                    for box in result.boxes:
                        # Extract detection info
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                        class_name = self.model.names[class_id]
                        
                        # Map to PPE class if applicable
                        ppe_class = self.ppe_classes.get(class_name, class_name)
                        
                        detection = {
                            "class": ppe_class,
                            "confidence": confidence,
                            "bbox": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],  # [x, y, width, height]
                            "id": f"{self.camera_id}-{len(detections)}-{int(time.time() * 1000)}"
                        }
                        detections.append(detection)
            
            # Prepare detection data for Nexxau
            detection_data = {
                "camera_id": self.camera_id,
                "timestamp": datetime.now().isoformat(),
                "detections": detections,
                "metadata": {
                    "location": metadata.get("location", "Unknown Location"),
                    "worksite_id": metadata.get("worksite_id", "default-worksite"),
                    "camera_name": metadata.get("camera_name", f"Camera {self.camera_id}"),
                    "stream_quality": metadata.get("stream_quality", 95),
                    "frame_rate": metadata.get("frame_rate", 30),
                    "frame_width": frame.shape[1],
                    "frame_height": frame.shape[0],
                    "detection_count": len(detections)
                }
            }
            
            return detection_data
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            return None

    def send_detection_to_nexxau(self, detection_data: Dict[str, Any]) -> bool:
        """
        Send detection data to Nexxau backend
        
        Args:
            detection_data: Detection data dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = requests.post(
                self.detection_endpoint,
                json=detection_data,
                timeout=5,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Detection sent successfully: {len(detection_data['detections'])} objects")
                return True
            else:
                logger.error(f"❌ Error sending detection: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error sending detection: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Error sending detection: {e}")
            return False

    def process_video_stream(self, 
                           video_source: str, 
                           metadata: Dict[str, Any] = None,
                           max_fps: int = 10,
                           send_interval: float = 1.0):
        """
        Process video stream and send detections to Nexxau
        
        Args:
            video_source: Video source (RTSP URL, file path, or camera index)
            metadata: Additional metadata
            max_fps: Maximum processing FPS
            send_interval: Interval between sending detections (seconds)
        """
        logger.info(f"Starting video stream processing: {video_source}")
        
        # Open video source
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            logger.error(f"❌ Could not open video source: {video_source}")
            return
        
        # Set frame rate
        cap.set(cv2.CAP_PROP_FPS, max_fps)
        
        frame_count = 0
        last_send_time = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    logger.warning("⚠️ Could not read frame, retrying...")
                    time.sleep(1)
                    continue
                
                frame_count += 1
                current_time = time.time()
                
                # Process frame
                detection_data = self.process_frame(frame, metadata)
                
                if detection_data and len(detection_data['detections']) > 0:
                    # Send detection if enough time has passed
                    if current_time - last_send_time >= send_interval:
                        success = self.send_detection_to_nexxau(detection_data)
                        if success:
                            last_send_time = current_time
                
                # Display frame with detections (optional)
                if frame_count % 30 == 0:  # Log every 30 frames
                    logger.info(f"Processed {frame_count} frames, {len(detection_data['detections']) if detection_data else 0} detections")
                
                # Control frame rate
                time.sleep(1.0 / max_fps)
                
        except KeyboardInterrupt:
            logger.info("🛑 Stopping video stream processing...")
        except Exception as e:
            logger.error(f"❌ Error in video stream processing: {e}")
        finally:
            cap.release()
            logger.info("📹 Video stream processing stopped")

    def process_image(self, image_path: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Process a single image and send detection to Nexxau
        
        Args:
            image_path: Path to image file
            metadata: Additional metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load image
            frame = cv2.imread(image_path)
            if frame is None:
                logger.error(f"❌ Could not load image: {image_path}")
                return False
            
            # Process frame
            detection_data = self.process_frame(frame, metadata)
            
            if detection_data:
                return self.send_detection_to_nexxau(detection_data)
            else:
                logger.warning("⚠️ No detection data generated")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error processing image: {e}")
            return False

    def test_connection(self) -> bool:
        """
        Test connection to Nexxau backend
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            response = requests.get(f"{self.nexxau_url}/api/health", timeout=5)
            if response.status_code == 200:
                logger.info("✅ Connection to Nexxau backend successful")
                return True
            else:
                logger.error(f"❌ Nexxau backend returned status: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Could not connect to Nexxau backend: {e}")
            return False

def main():
    """
    Main function for testing the integration
    """
    # Configuration
    config = {
        "model_path": "yolov8n.pt",  # Change to your model path
        "nexxau_url": "http://localhost:3000",
        "camera_id": "camera-1",
        "confidence_threshold": 0.5,
        "video_source": 0,  # Use 0 for webcam, or RTSP URL like "rtsp://192.168.1.100/stream"
        "metadata": {
            "location": "Construction Site A",
            "worksite_id": "worksite-1",
            "camera_name": "Main Entrance Camera",
            "stream_quality": 95,
            "frame_rate": 30
        }
    }
    
    # Initialize integration
    integration = NexxauYOLOIntegration(
        model_path=config["model_path"],
        nexxau_url=config["nexxau_url"],
        camera_id=config["camera_id"],
        confidence_threshold=config["confidence_threshold"]
    )
    
    # Test connection
    if not integration.test_connection():
        logger.error("❌ Cannot connect to Nexxau backend. Please check if it's running.")
        return
    
    # Process video stream
    integration.process_video_stream(
        video_source=config["video_source"],
        metadata=config["metadata"],
        max_fps=10,
        send_interval=2.0  # Send detections every 2 seconds
    )

if __name__ == "__main__":
    main()
