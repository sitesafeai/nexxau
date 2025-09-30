#!/usr/bin/env python3
"""
Nexxau AI Detection - Real-time YOLO Detector
Processes live video streams and sends detection results to the web app
"""

import cv2
import numpy as np
import json
import time
import requests
import threading
import logging
from pathlib import Path
from ultralytics import YOLO
from typing import Dict, List, Optional, Tuple
import base64
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RealTimeDetector:
    def __init__(self, model_path: str = "yolov8n.pt", web_app_url: str = "http://localhost:3000"):
        """
        Initialize the real-time detector.
        
        Args:
            model_path: Path to YOLO model file
            web_app_url: URL of the web application
        """
        self.model_path = model_path
        self.web_app_url = web_app_url
        self.model = None
        self.detection_threads = {}
        self.running = False
        
        # Detection classes for safety monitoring
        self.safety_classes = {
            0: 'person',
            1: 'bicycle', 
            2: 'car',
            3: 'motorcycle',
            5: 'bus',
            7: 'truck',
            9: 'traffic_light',
            11: 'stop_sign',
            15: 'cat',
            16: 'dog'
        }
        
        # PPE and safety specific classes (if using custom model)
        self.ppe_classes = {
            'hard_hat': 0,
            'safety_vest': 1,
            'safety_glasses': 2,
            'gloves': 3,
            'boots': 4,
            'person': 5
        }
        
        self.load_model()
    
    def load_model(self):
        """Load the YOLO model."""
        try:
            logger.info(f"Loading YOLO model from {self.model_path}")
            self.model = YOLO(self.model_path)
            logger.info("✅ YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            raise
    
    def detect_objects(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect objects in a frame using YOLO.
        
        Args:
            frame: Input frame as numpy array
            
        Returns:
            List of detection dictionaries
        """
        if self.model is None:
            return []
        
        try:
            # Run YOLO detection
            results = self.model(frame, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        confidence = boxes.conf[i].cpu().numpy()
                        class_id = int(boxes.cls[i].cpu().numpy())
                        
                        # Get class name
                        class_name = self.safety_classes.get(class_id, f"class_{class_id}")
                        
                        # Only include high-confidence detections
                        if confidence > 0.5:
                            detection = {
                                'class_id': class_id,
                                'class_name': class_name,
                                'confidence': float(confidence),
                                'bbox': {
                                    'x1': float(x1),
                                    'y1': float(y1),
                                    'x2': float(x2),
                                    'y2': float(y2)
                                },
                                'timestamp': datetime.now().isoformat()
                            }
                            detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"Error in object detection: {e}")
            return []
    
    def draw_detections(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """
        Draw bounding boxes and labels on the frame.
        
        Args:
            frame: Input frame
            detections: List of detection dictionaries
            
        Returns:
            Frame with drawn detections
        """
        frame_with_detections = frame.copy()
        
        for detection in detections:
            bbox = detection['bbox']
            x1, y1, x2, y2 = int(bbox['x1']), int(bbox['y1']), int(bbox['x2']), int(bbox['y2'])
            confidence = detection['confidence']
            class_name = detection['class_name']
            
            # Choose color based on class
            if class_name == 'person':
                color = (0, 255, 0)  # Green for people
            elif class_name in ['car', 'truck', 'bus', 'motorcycle']:
                color = (255, 0, 0)  # Red for vehicles
            else:
                color = (0, 0, 255)  # Blue for other objects
            
            # Draw bounding box
            cv2.rectangle(frame_with_detections, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(frame_with_detections, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), color, -1)
            cv2.putText(frame_with_detections, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        return frame_with_detections
    
    def send_detection_results(self, camera_id: str, detections: List[Dict], frame: np.ndarray):
        """
        Send detection results to the web application.
        
        Args:
            camera_id: ID of the camera
            detections: List of detections
            frame: Frame with detections drawn
        """
        try:
            # Encode frame as base64 for transmission
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Prepare detection data
            detection_data = {
                'camera_id': camera_id,
                'timestamp': datetime.now().isoformat(),
                'detections': detections,
                'frame_data': frame_base64,
                'frame_width': frame.shape[1],
                'frame_height': frame.shape[0]
            }
            
            # Send to web app API
            response = requests.post(
                f"{self.web_app_url}/api/yolo/process",
                json=detection_data,
                timeout=5
            )
            
            if response.status_code == 200:
                logger.debug(f"Detection results sent for camera {camera_id}")
            else:
                logger.warning(f"Failed to send detection results: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending detection results: {e}")
    
    def process_stream(self, camera_id: str, stream_url: str, hls_url: str = None):
        """
        Process a video stream for real-time detection.
        
        Args:
            camera_id: Unique identifier for the camera
            stream_url: URL of the video stream (RTSP, HTTP, etc.)
            hls_url: Optional HLS URL for web display
        """
        logger.info(f"Starting detection for camera {camera_id}: {stream_url}")
        
        try:
            # Open video stream
            cap = cv2.VideoCapture(stream_url)
            
            if not cap.isOpened():
                logger.error(f"Failed to open stream: {stream_url}")
                return
            
            # Set buffer size for lower latency
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            frame_count = 0
            last_detection_time = 0
            detection_interval = 1.0  # Process every 1 second
            
            while self.running:
                ret, frame = cap.read()
                
                if not ret:
                    logger.warning(f"Failed to read frame from camera {camera_id}")
                    time.sleep(0.1)
                    continue
                
                current_time = time.time()
                
                # Process frame for detection
                if current_time - last_detection_time >= detection_interval:
                    detections = self.detect_objects(frame)
                    
                    if detections:
                        logger.info(f"Camera {camera_id}: Found {len(detections)} objects")
                        
                        # Draw detections on frame
                        frame_with_detections = self.draw_detections(frame, detections)
                        
                        # Send results to web app
                        self.send_detection_results(camera_id, detections, frame_with_detections)
                    
                    last_detection_time = current_time
                
                frame_count += 1
                
                # Small delay to prevent overwhelming the system
                time.sleep(0.033)  # ~30 FPS
                
        except Exception as e:
            logger.error(f"Error processing stream for camera {camera_id}: {e}")
        finally:
            if 'cap' in locals():
                cap.release()
            logger.info(f"Stopped processing camera {camera_id}")
    
    def start_detection(self, camera_id: str, stream_url: str, hls_url: str = None):
        """
        Start detection for a camera in a separate thread.
        
        Args:
            camera_id: Unique identifier for the camera
            stream_url: URL of the video stream
            hls_url: Optional HLS URL for web display
        """
        if camera_id in self.detection_threads:
            logger.warning(f"Camera {camera_id} is already being processed")
            return
        
        self.running = True
        thread = threading.Thread(
            target=self.process_stream,
            args=(camera_id, stream_url, hls_url),
            daemon=True
        )
        thread.start()
        self.detection_threads[camera_id] = thread
        
        logger.info(f"Started detection thread for camera {camera_id}")
    
    def stop_detection(self, camera_id: str):
        """Stop detection for a specific camera."""
        if camera_id in self.detection_threads:
            self.detection_threads[camera_id].join(timeout=5)
            del self.detection_threads[camera_id]
            logger.info(f"Stopped detection for camera {camera_id}")
    
    def stop_all_detections(self):
        """Stop all running detections."""
        self.running = False
        for camera_id in list(self.detection_threads.keys()):
            self.stop_detection(camera_id)
        logger.info("Stopped all detections")

def main():
    """Main function for testing the detector."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Nexxau Real-time YOLO Detector')
    parser.add_argument('--camera-id', required=True, help='Camera ID')
    parser.add_argument('--stream-url', required=True, help='Stream URL (RTSP, HTTP, etc.)')
    parser.add_argument('--hls-url', help='HLS URL for web display')
    parser.add_argument('--model', default='yolov8n.pt', help='YOLO model path')
    parser.add_argument('--web-app-url', default='http://localhost:3000', help='Web app URL')
    
    args = parser.parse_args()
    
    # Create detector
    detector = RealTimeDetector(
        model_path=args.model,
        web_app_url=args.web_app_url
    )
    
    try:
        # Start detection
        detector.start_detection(
            camera_id=args.camera_id,
            stream_url=args.stream_url,
            hls_url=args.hls_url
        )
        
        # Keep running until interrupted
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Stopping detector...")
        detector.stop_all_detections()

if __name__ == "__main__":
    main()
