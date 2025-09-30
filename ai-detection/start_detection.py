#!/usr/bin/env python3
"""
Simple YOLO detection service for the web app
Starts detection for all cameras and sends results to the API
"""

import cv2
import numpy as np
import json
import time
import requests
import threading
import logging
from ultralytics import YOLO
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleDetectionService:
    def __init__(self, web_app_url="http://localhost:3000"):
        self.web_app_url = web_app_url
        self.model = YOLO('yolov8n.pt')
        self.running = False
        self.detection_threads = {}
        
        # Safety classes mapping
        self.safety_classes = {
            0: 'person',
            1: 'bicycle', 
            2: 'car',
            3: 'motorcycle',
            5: 'bus',
            7: 'truck',
            9: 'traffic_light',
            11: 'stop_sign'
        }
    
    def detect_objects(self, frame):
        """Detect objects in a frame using YOLO."""
        try:
            results = self.model(frame, verbose=False)
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        confidence = boxes.conf[i].cpu().numpy()
                        class_id = int(boxes.cls[i].cpu().numpy())
                        
                        if confidence > 0.5:  # Only high confidence detections
                            class_name = self.safety_classes.get(class_id, f"class_{class_id}")
                            
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
    
    def send_detection_results(self, camera_id, detections, frame):
        """Send detection results to the web app API."""
        try:
            import base64
            
            # Encode frame as base64
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            detection_data = {
                'camera_id': camera_id,
                'timestamp': datetime.now().isoformat(),
                'detections': detections,
                'frame_data': frame_base64,
                'frame_width': frame.shape[1],
                'frame_height': frame.shape[0]
            }
            
            response = requests.post(
                f"{self.web_app_url}/api/yolo/detections",
                json=detection_data,
                timeout=5
            )
            
            if response.status_code == 200:
                logger.debug(f"Detection results sent for camera {camera_id}")
            else:
                logger.warning(f"Failed to send detection results: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending detection results: {e}")
    
    def process_camera(self, camera_id, stream_url):
        """Process a single camera stream."""
        logger.info(f"Starting detection for camera {camera_id}: {stream_url}")
        
        try:
            cap = cv2.VideoCapture(stream_url)
            
            if not cap.isOpened():
                logger.error(f"Failed to open stream: {stream_url}")
                return
            
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            frame_count = 0
            last_detection_time = 0
            detection_interval = 2.0  # Process every 2 seconds
            
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
                        self.send_detection_results(camera_id, detections, frame)
                    
                    last_detection_time = current_time
                
                frame_count += 1
                time.sleep(0.033)  # ~30 FPS
                
        except Exception as e:
            logger.error(f"Error processing camera {camera_id}: {e}")
        finally:
            if 'cap' in locals():
                cap.release()
            logger.info(f"Stopped processing camera {camera_id}")
    
    def get_cameras(self):
        """Get cameras from the web app."""
        try:
            response = requests.get(f"{self.web_app_url}/api/cameras", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch cameras: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error fetching cameras: {e}")
            return []
    
    def start_all_cameras(self):
        """Start detection for all cameras."""
        logger.info("Starting detection for all cameras...")
        
        cameras = self.get_cameras()
        if not cameras:
            logger.warning("No cameras found")
            return
        
        self.running = True
        
        for camera in cameras:
            camera_id = camera['id']
            # Prefer HLS URL for web compatibility
            stream_url = camera.get('hlsUrl') or camera.get('streamUrl')
            
            if not stream_url:
                logger.warning(f"No stream URL for camera {camera_id}")
                continue
            
            # Skip RTSP streams that don't have HLS conversion
            if stream_url.startswith('rtsp://') and not camera.get('hlsUrl'):
                logger.warning(f"Skipping RTSP stream without HLS conversion: {camera_id}")
                continue
            
            # Start detection in a separate thread
            thread = threading.Thread(
                target=self.process_camera,
                args=(camera_id, stream_url),
                daemon=True
            )
            thread.start()
            self.detection_threads[camera_id] = thread
            
            logger.info(f"Started detection for camera {camera_id}")
            time.sleep(1)  # Small delay between camera starts
    
    def stop_all_cameras(self):
        """Stop all camera detections."""
        logger.info("Stopping all camera detections...")
        self.running = False
        
        for camera_id in list(self.detection_threads.keys()):
            self.detection_threads[camera_id].join(timeout=5)
            del self.detection_threads[camera_id]
        
        logger.info("Stopped all camera detections")
    
    def run(self):
        """Run the detection service."""
        try:
            self.start_all_cameras()
            
            # Keep running until interrupted
            while True:
                time.sleep(10)
                
        except KeyboardInterrupt:
            logger.info("Detection service interrupted")
        finally:
            self.stop_all_cameras()

def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Simple YOLO Detection Service')
    parser.add_argument('--web-app-url', default='http://localhost:3000', help='Web app URL')
    
    args = parser.parse_args()
    
    service = SimpleDetectionService(web_app_url=args.web_app_url)
    service.run()

if __name__ == "__main__":
    main()
