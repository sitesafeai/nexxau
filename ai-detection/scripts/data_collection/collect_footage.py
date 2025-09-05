#!/usr/bin/env python3
"""
Nexxau AI Detection - Data Collection Script
Collects footage from cameras for YOLO training
"""

import cv2
import os
import time
import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FootageCollector:
    def __init__(self, output_dir: str = "data/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cameras: Dict[str, cv2.VideoCapture] = {}
        self.recording: Dict[str, bool] = {}
        
    def connect_camera(self, camera_id: str, stream_url: str) -> bool:
        """Connect to a camera stream."""
        try:
            cap = cv2.VideoCapture(stream_url)
            if not cap.isOpened():
                logger.error(f"Failed to connect to camera {camera_id}")
                return False
            
            self.cameras[camera_id] = cap
            self.recording[camera_id] = False
            logger.info(f"Connected to camera {camera_id}")
            return True
        except Exception as e:
            logger.error(f"Error connecting to camera {camera_id}: {e}")
            return False
    
    def start_recording(self, camera_id: str, duration: int = 300, fps: int = 10):
        """Start recording from a camera for specified duration."""
        if camera_id not in self.cameras:
            logger.error(f"Camera {camera_id} not connected")
            return False
        
        if self.recording[camera_id]:
            logger.warning(f"Camera {camera_id} is already recording")
            return False
        
        # Create output directory for this camera
        camera_dir = self.output_dir / camera_id
        camera_dir.mkdir(exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = camera_dir / f"{camera_id}_{timestamp}.mp4"
        
        # Get camera properties
        cap = self.cameras[camera_id]
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Initialize video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(filename), fourcc, fps, (width, height))
        
        logger.info(f"Started recording from camera {camera_id} for {duration} seconds")
        self.recording[camera_id] = True
        
        # Record frames
        start_time = time.time()
        frame_count = 0
        
        while time.time() - start_time < duration and self.recording[camera_id]:
            ret, frame = cap.read()
            if ret:
                out.write(frame)
                frame_count += 1
                
                # Display progress
                elapsed = time.time() - start_time
                if frame_count % fps == 0:  # Log every second
                    logger.info(f"Camera {camera_id}: {elapsed:.1f}s / {duration}s ({frame_count} frames)")
                
                # Add small delay to control FPS
                time.sleep(1/fps)
            else:
                logger.warning(f"Failed to read frame from camera {camera_id}")
                break
        
        # Cleanup
        out.release()
        self.recording[camera_id] = False
        
        logger.info(f"Finished recording from camera {camera_id}: {filename} ({frame_count} frames)")
        return str(filename)
    
    def stop_recording(self, camera_id: str):
        """Stop recording from a camera."""
        if camera_id in self.recording:
            self.recording[camera_id] = False
            logger.info(f"Stopped recording from camera {camera_id}")
    
    def capture_snapshot(self, camera_id: str, save_path: Optional[str] = None) -> Optional[str]:
        """Capture a single snapshot from a camera."""
        if camera_id not in self.cameras:
            logger.error(f"Camera {camera_id} not connected")
            return None
        
        cap = self.cameras[camera_id]
        ret, frame = cap.read()
        
        if ret:
            if save_path is None:
                # Generate default path
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                camera_dir = self.output_dir / camera_id
                camera_dir.mkdir(exist_ok=True)
                save_path = camera_dir / f"{camera_id}_{timestamp}_snapshot.jpg"
            
            cv2.imwrite(str(save_path), frame)
            logger.info(f"Captured snapshot from camera {camera_id}: {save_path}")
            return str(save_path)
        else:
            logger.error(f"Failed to capture snapshot from camera {camera_id}")
            return None
    
    def continuous_capture(self, camera_id: str, interval: int = 60, max_images: int = 100):
        """Continuously capture images at specified intervals."""
        if camera_id not in self.cameras:
            logger.error(f"Camera {camera_id} not connected")
            return
        
        camera_dir = self.output_dir / camera_id / "continuous"
        camera_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Starting continuous capture from camera {camera_id} every {interval} seconds")
        
        image_count = 0
        while image_count < max_images:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = camera_dir / f"{camera_id}_{timestamp}_continuous_{image_count:04d}.jpg"
            
            if self.capture_snapshot(camera_id, str(filename)):
                image_count += 1
                logger.info(f"Captured image {image_count}/{max_images} from camera {camera_id}")
            
            time.sleep(interval)
        
        logger.info(f"Completed continuous capture from camera {camera_id}: {image_count} images")
    
    def disconnect_camera(self, camera_id: str):
        """Disconnect from a camera stream."""
        if camera_id in self.cameras:
            self.stop_recording(camera_id)
            self.cameras[camera_id].release()
            del self.cameras[camera_id]
            del self.recording[camera_id]
            logger.info(f"Disconnected from camera {camera_id}")
    
    def get_camera_info(self, camera_id: str) -> Optional[Dict]:
        """Get information about a connected camera."""
        if camera_id not in self.cameras:
            return None
        
        cap = self.cameras[camera_id]
        return {
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'recording': self.recording.get(camera_id, False)
        }

def main():
    parser = argparse.ArgumentParser(description="Collect footage from cameras for YOLO training")
    parser.add_argument("--config", "-c", default="cameras.json", help="Camera configuration file")
    parser.add_argument("--output", "-o", default="data/raw", help="Output directory for footage")
    parser.add_argument("--mode", "-m", choices=["snapshot", "record", "continuous"], 
                       default="snapshot", help="Collection mode")
    parser.add_argument("--duration", "-d", type=int, default=300, help="Recording duration in seconds")
    parser.add_argument("--interval", "-i", type=int, default=60, help="Snapshot interval in seconds")
    
    args = parser.parse_args()
    
    # Load camera configuration
    try:
        with open(args.config, 'r') as f:
            cameras = json.load(f)
    except FileNotFoundError:
        logger.error(f"Camera configuration file {args.config} not found")
        return
    
    # Initialize collector
    collector = FootageCollector(args.output)
    
    try:
        # Connect to cameras
        for camera_id, config in cameras.items():
            if collector.connect_camera(camera_id, config['stream_url']):
                logger.info(f"Successfully connected to camera {camera_id}")
            else:
                logger.error(f"Failed to connect to camera {camera_id}")
        
        # Start collection based on mode
        if args.mode == "snapshot":
            for camera_id in cameras.keys():
                if camera_id in collector.cameras:
                    collector.capture_snapshot(camera_id)
        
        elif args.mode == "record":
            for camera_id in cameras.keys():
                if camera_id in collector.cameras:
                    collector.start_recording(camera_id, args.duration)
        
        elif args.mode == "continuous":
            for camera_id in cameras.keys():
                if camera_id in collector.cameras:
                    collector.continuous_capture(camera_id, args.interval)
        
        # Keep running for continuous modes
        if args.mode in ["record", "continuous"]:
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Stopping collection...")
        
    finally:
        # Cleanup
        for camera_id in list(collector.cameras.keys()):
            collector.disconnect_camera(camera_id)

if __name__ == "__main__":
    main()
