#!/usr/bin/env python3
"""
Real-time YOLO detection system that processes live video streams
and sends detection results to the web app for live overlay display.
"""

import cv2
import numpy as np
import requests
import json
import time
import threading
import logging
from datetime import datetime
from ultralytics import YOLO
import base64
from io import BytesIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RealtimeYOLODetector:
    def __init__(self, web_app_url="http://localhost:3001"):
        self.web_app_url = web_app_url
        self.model = None
        self.running = False
        self.detection_threads = {}
        
    def load_model(self):
        """Load YOLO model."""
        try:
            logger.info("Loading YOLO model...")
            self.model = YOLO('yolov8n.pt')
            logger.info("✅ YOLO model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            return False
    
    def process_frame(self, frame):
        """Process a single frame with YOLO detection."""
        if self.model is None:
            return []
        
        try:
            # Run YOLO detection
            results = self.model(frame, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Only detect people (class 0)
                        if class_id == 0 and confidence > 0.5:
                            detection = {
                                'class_id': class_id,
                                'class_name': 'person',
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
            logger.error(f"Error processing frame: {e}")
            return []
    
    def send_detection_results(self, camera_id, detections, frame):
        """Send detection results to the web app API."""
        try:
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
                timeout=0.5  # Very short timeout for real-time processing
            )
            
            if response.status_code == 200:
                logger.debug(f"✅ Sent {len(detections)} detections for camera {camera_id}")
            else:
                logger.warning(f"⚠️ Failed to send detections: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending detection results: {e}")
    
    def process_camera_stream(self, camera_id, stream_url):
        """Process a single camera stream in real-time."""
        logger.info(f"🎥 Starting real-time detection for camera {camera_id}: {stream_url}")
        
        try:
            # Open video stream
            cap = cv2.VideoCapture(stream_url)
            if not cap.isOpened():
                logger.error(f"❌ Failed to open stream: {stream_url}")
                return
            
            frame_count = 0
            last_detection_time = 0
            
            while self.running:
                ret, frame = cap.read()
                if not ret:
                    logger.warning(f"⚠️ Failed to read frame from camera {camera_id}")
                    time.sleep(0.1)
                    continue
                
                frame_count += 1
                current_time = time.time()
                
                # Process every 2nd frame for better responsiveness (15 FPS detection)
                if frame_count % 2 == 0:
                    detections = self.process_frame(frame)
                    
                    if detections:
                        logger.info(f"🎯 Camera {camera_id}: Found {len(detections)} people")
                        self.send_detection_results(camera_id, detections, frame)
                        last_detection_time = current_time
                    elif current_time - last_detection_time > 3:  # Log every 3 seconds if no detections
                        logger.debug(f"📊 Camera {camera_id}: No people detected")
                        last_detection_time = current_time
                
                # Minimal delay for real-time processing
                time.sleep(0.02)  # ~50 FPS processing
                
        except Exception as e:
            logger.error(f"Error processing camera {camera_id}: {e}")
        finally:
            if 'cap' in locals():
                cap.release()
            logger.info(f"🛑 Stopped processing camera {camera_id}")
    
    def get_cameras(self):
        """Get list of cameras from the web app."""
        try:
            response = requests.get(f"{self.web_app_url}/api/cameras", timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get cameras: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error getting cameras: {e}")
            return []
    
    def start_detection(self):
        """Start real-time detection for all cameras."""
        if not self.load_model():
            return False
        
        cameras = self.get_cameras()
        if not cameras:
            logger.warning("No cameras found")
            return False
        
        self.running = True
        logger.info(f"🚀 Starting real-time detection for {len(cameras)} cameras")
        
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
                target=self.process_camera_stream,
                args=(camera_id, stream_url),
                daemon=True
            )
            thread.start()
            self.detection_threads[camera_id] = thread
            logger.info(f"✅ Started detection thread for camera {camera_id}")
        
        return True
    
    def stop_detection(self):
        """Stop all detection threads."""
        logger.info("🛑 Stopping real-time detection...")
        self.running = False
        
        # Wait for all threads to finish
        for camera_id, thread in self.detection_threads.items():
            thread.join(timeout=5)
            logger.info(f"✅ Stopped detection for camera {camera_id}")
        
        self.detection_threads.clear()
        logger.info("🛑 All detection threads stopped")

def main():
    """Main function to run real-time YOLO detection."""
    detector = RealtimeYOLODetector()
    
    try:
        if detector.start_detection():
            logger.info("🎯 Real-time YOLO detection is running...")
            logger.info("Press Ctrl+C to stop")
            
            # Keep the main thread alive
            while True:
                time.sleep(1)
        else:
            logger.error("❌ Failed to start detection")
            
    except KeyboardInterrupt:
        logger.info("🛑 Received interrupt signal")
    finally:
        detector.stop_detection()
        logger.info("👋 Real-time detection stopped")

if __name__ == "__main__":
    main()
