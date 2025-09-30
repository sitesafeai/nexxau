#!/usr/bin/env python3
"""
Nexxau AI Detection - Detection Manager
Manages multiple camera streams and coordinates detection across all cameras
"""

import json
import time
import logging
import requests
from pathlib import Path
from typing import Dict, List, Optional
from real_time_detector import RealTimeDetector
import threading
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DetectionManager:
    def __init__(self, web_app_url: str = "http://localhost:3000", model_path: str = "yolov8n.pt"):
        """
        Initialize the detection manager.
        
        Args:
            web_app_url: URL of the web application
            model_path: Path to YOLO model file
        """
        self.web_app_url = web_app_url
        self.model_path = model_path
        self.detector = RealTimeDetector(model_path=model_path, web_app_url=web_app_url)
        self.active_cameras = {}
        self.camera_config = {}
        self.running = False
        
        # Load camera configuration
        self.load_camera_config()
    
    def load_camera_config(self):
        """Load camera configuration from file or web app."""
        try:
            # Try to load from local file first
            config_file = Path("cameras.json")
            if config_file.exists():
                with open(config_file, 'r') as f:
                    self.camera_config = json.load(f)
                logger.info(f"Loaded camera config from {config_file}")
            else:
                # Try to fetch from web app
                self.fetch_camera_config_from_webapp()
                
        except Exception as e:
            logger.error(f"Failed to load camera config: {e}")
            self.camera_config = {}
    
    def fetch_camera_config_from_webapp(self):
        """Fetch camera configuration from the web application."""
        try:
            response = requests.get(f"{self.web_app_url}/api/cameras", timeout=10)
            if response.status_code == 200:
                cameras_data = response.json()
                self.camera_config = {}
                
                for camera in cameras_data:
                    camera_id = str(camera['id'])
                    self.camera_config[camera_id] = {
                        'name': camera['name'],
                        'stream_url': camera['streamUrl'],
                        'hls_url': camera.get('hlsUrl'),
                        'location': camera['location'],
                        'type': camera['type']
                    }
                
                logger.info(f"Fetched {len(self.camera_config)} cameras from web app")
            else:
                logger.warning(f"Failed to fetch cameras from web app: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error fetching camera config from web app: {e}")
    
    def start_camera_detection(self, camera_id: str, camera_info: Dict):
        """Start detection for a specific camera."""
        try:
            stream_url = camera_info['stream_url']
            hls_url = camera_info.get('hls_url')
            
            logger.info(f"Starting detection for camera {camera_id}: {camera_info['name']}")
            
            # Start detection in a separate thread
            self.detector.start_detection(
                camera_id=camera_id,
                stream_url=stream_url,
                hls_url=hls_url
            )
            
            self.active_cameras[camera_id] = {
                'info': camera_info,
                'start_time': datetime.now(),
                'status': 'running'
            }
            
            logger.info(f"✅ Camera {camera_id} detection started")
            
        except Exception as e:
            logger.error(f"Failed to start detection for camera {camera_id}: {e}")
            self.active_cameras[camera_id] = {
                'info': camera_info,
                'start_time': datetime.now(),
                'status': 'error',
                'error': str(e)
            }
    
    def stop_camera_detection(self, camera_id: str):
        """Stop detection for a specific camera."""
        try:
            self.detector.stop_detection(camera_id)
            
            if camera_id in self.active_cameras:
                self.active_cameras[camera_id]['status'] = 'stopped'
                self.active_cameras[camera_id]['stop_time'] = datetime.now()
            
            logger.info(f"Stopped detection for camera {camera_id}")
            
        except Exception as e:
            logger.error(f"Failed to stop detection for camera {camera_id}: {e}")
    
    def start_all_cameras(self):
        """Start detection for all configured cameras."""
        logger.info("Starting detection for all cameras...")
        
        if not self.camera_config:
            logger.warning("No camera configuration found")
            return
        
        self.running = True
        
        for camera_id, camera_info in self.camera_config.items():
            # Start each camera in a separate thread to avoid blocking
            thread = threading.Thread(
                target=self.start_camera_detection,
                args=(camera_id, camera_info),
                daemon=True
            )
            thread.start()
            time.sleep(1)  # Small delay between camera starts
        
        logger.info(f"Started detection for {len(self.camera_config)} cameras")
    
    def stop_all_cameras(self):
        """Stop detection for all cameras."""
        logger.info("Stopping all camera detections...")
        
        self.running = False
        self.detector.stop_all_detections()
        
        for camera_id in list(self.active_cameras.keys()):
            self.active_cameras[camera_id]['status'] = 'stopped'
            self.active_cameras[camera_id]['stop_time'] = datetime.now()
        
        logger.info("Stopped all camera detections")
    
    def get_camera_status(self) -> Dict:
        """Get status of all cameras."""
        status = {
            'total_cameras': len(self.camera_config),
            'active_cameras': len([c for c in self.active_cameras.values() if c['status'] == 'running']),
            'cameras': {}
        }
        
        for camera_id, camera_data in self.active_cameras.items():
            status['cameras'][camera_id] = {
                'name': camera_data['info']['name'],
                'status': camera_data['status'],
                'start_time': camera_data['start_time'].isoformat(),
                'error': camera_data.get('error')
            }
            
            if 'stop_time' in camera_data:
                status['cameras'][camera_id]['stop_time'] = camera_data['stop_time'].isoformat()
        
        return status
    
    def refresh_camera_config(self):
        """Refresh camera configuration from web app."""
        logger.info("Refreshing camera configuration...")
        self.fetch_camera_config_from_webapp()
    
    def add_camera(self, camera_id: str, camera_info: Dict):
        """Add a new camera to the configuration."""
        self.camera_config[camera_id] = camera_info
        logger.info(f"Added camera {camera_id}: {camera_info['name']}")
    
    def remove_camera(self, camera_id: str):
        """Remove a camera from the configuration."""
        if camera_id in self.camera_config:
            # Stop detection if running
            if camera_id in self.active_cameras:
                self.stop_camera_detection(camera_id)
            
            del self.camera_config[camera_id]
            logger.info(f"Removed camera {camera_id}")
    
    def run_monitoring_loop(self):
        """Run the main monitoring loop."""
        logger.info("Starting detection manager monitoring loop...")
        
        try:
            while self.running:
                # Check camera status
                status = self.get_camera_status()
                logger.info(f"Active cameras: {status['active_cameras']}/{status['total_cameras']}")
                
                # Refresh configuration every 5 minutes
                if int(time.time()) % 300 == 0:
                    self.refresh_camera_config()
                
                time.sleep(10)  # Check every 10 seconds
                
        except KeyboardInterrupt:
            logger.info("Monitoring loop interrupted")
        finally:
            self.stop_all_cameras()

def main():
    """Main function for running the detection manager."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Nexxau Detection Manager')
    parser.add_argument('--web-app-url', default='http://localhost:3000', help='Web app URL')
    parser.add_argument('--model', default='yolov8n.pt', help='YOLO model path')
    parser.add_argument('--config-file', help='Camera configuration file')
    
    args = parser.parse_args()
    
    # Create detection manager
    manager = DetectionManager(
        web_app_url=args.web_app_url,
        model_path=args.model
    )
    
    try:
        # Start all cameras
        manager.start_all_cameras()
        
        # Run monitoring loop
        manager.run_monitoring_loop()
        
    except KeyboardInterrupt:
        logger.info("Shutting down detection manager...")
        manager.stop_all_cameras()

if __name__ == "__main__":
    main()
