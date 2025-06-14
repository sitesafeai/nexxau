import cv2
import numpy as np
import torch
import time
import json
import requests
from ultralytics import YOLO
from typing import Dict, List, Optional
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AIDetectionService:
    def __init__(self, config_path: str = 'config.json'):
        self.config = self._load_config(config_path)
        self.model = self._load_model()
        self.cameras: Dict[str, cv2.VideoCapture] = {}
        self.last_detection: Dict[str, float] = {}
        self.min_detection_interval = 5.0  # seconds between detections per camera

    def _load_config(self, config_path: str) -> dict:
        with open(config_path, 'r') as f:
            return json.load(f)

    def _load_model(self) -> YOLO:
        model_path = self.config['model_path']
        logger.info(f"Loading YOLO model from {model_path}")
        return YOLO(model_path)

    def connect_camera(self, camera_id: str, rtsp_url: str) -> bool:
        """Connect to a camera stream."""
        try:
            cap = cv2.VideoCapture(rtsp_url)
            if not cap.isOpened():
                logger.error(f"Failed to connect to camera {camera_id}")
                return False
            
            self.cameras[camera_id] = cap
            self.last_detection[camera_id] = 0
            logger.info(f"Connected to camera {camera_id}")
            return True
        except Exception as e:
            logger.error(f"Error connecting to camera {camera_id}: {e}")
            return False

    def disconnect_camera(self, camera_id: str):
        """Disconnect from a camera stream."""
        if camera_id in self.cameras:
            self.cameras[camera_id].release()
            del self.cameras[camera_id]
            del self.last_detection[camera_id]
            logger.info(f"Disconnected from camera {camera_id}")

    def process_frame(self, frame: np.ndarray, camera_id: str) -> Optional[dict]:
        """Process a single frame and return detection results."""
        try:
            # Run YOLO detection
            results = self.model(frame, conf=0.5)
            
            # Process results
            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    
                    detections.append({
                        'class': self.model.names[cls],
                        'confidence': conf,
                        'bbox': xyxy
                    })

            if detections:
                return {
                    'camera_id': camera_id,
                    'timestamp': time.time(),
                    'detections': detections
                }
            return None

        except Exception as e:
            logger.error(f"Error processing frame from camera {camera_id}: {e}")
            return None

    def send_alert(self, detection: dict):
        """Send detection alert to the backend."""
        try:
            response = requests.post(
                self.config['alert_endpoint'],
                json=detection,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            logger.info(f"Alert sent successfully for camera {detection['camera_id']}")
        except Exception as e:
            logger.error(f"Error sending alert: {e}")

    def run(self):
        """Main processing loop."""
        logger.info("Starting AI detection service")
        
        while True:
            for camera_id, cap in self.cameras.items():
                # Check if enough time has passed since last detection
                current_time = time.time()
                if current_time - self.last_detection[camera_id] < self.min_detection_interval:
                    continue

                ret, frame = cap.read()
                if not ret:
                    logger.warning(f"Failed to read frame from camera {camera_id}")
                    continue

                # Process frame
                detection = self.process_frame(frame, camera_id)
                if detection:
                    self.send_alert(detection)
                    self.last_detection[camera_id] = current_time

            time.sleep(0.1)  # Small delay to prevent CPU overload

def main():
    # Create config directory if it doesn't exist
    config_dir = Path('config')
    config_dir.mkdir(exist_ok=True)

    # Create default config if it doesn't exist
    config_path = config_dir / 'config.json'
    if not config_path.exists():
        default_config = {
            'model_path': 'models/yolov8n.pt',
            'alert_endpoint': 'http://localhost:3000/api/alerts',
            'cameras': {
                'CAM-001': 'rtsp://camera1.example.com/stream',
                'CAM-002': 'rtsp://camera2.example.com/stream'
            }
        }
        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=2)

    # Initialize and run the service
    service = AIDetectionService(str(config_path))
    
    # Connect to configured cameras
    for camera_id, rtsp_url in service.config['cameras'].items():
        service.connect_camera(camera_id, rtsp_url)

    try:
        service.run()
    except KeyboardInterrupt:
        logger.info("Shutting down AI detection service")
        for camera_id in list(service.cameras.keys()):
            service.disconnect_camera(camera_id)

if __name__ == '__main__':
    main() 