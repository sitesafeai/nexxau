#!/usr/bin/env python3
"""
Test script for live YOLO detection with the people detection stream
"""

import sys
import time
import logging
from pathlib import Path

# Add the ai-detection directory to Python path
sys.path.append(str(Path(__file__).parent))

from real_time_detector import RealTimeDetector

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_live_detection():
    """Test live detection with the people detection stream."""
    
    # Stream URLs
    rtsp_url = "rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people"
    hls_url = "http://localhost:8888/streams/people/index.m3u8"
    camera_id = "people_detection_test"
    
    logger.info("🎯 Starting live YOLO detection test...")
    logger.info(f"RTSP URL: {rtsp_url}")
    logger.info(f"HLS URL: {hls_url}")
    
    try:
        # Create detector
        detector = RealTimeDetector(
            model_path="yolov8n.pt",  # Use the default YOLOv8 nano model
            web_app_url="http://localhost:3000"
        )
        
        logger.info("✅ YOLO detector initialized")
        
        # Start detection
        detector.start_detection(
            camera_id=camera_id,
            stream_url=rtsp_url,
            hls_url=hls_url
        )
        
        logger.info("🚀 Detection started! Press Ctrl+C to stop...")
        
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("🛑 Stopping detection...")
            detector.stop_all_detections()
            
    except Exception as e:
        logger.error(f"❌ Error during detection test: {e}")
        return False
    
    logger.info("✅ Detection test completed")
    return True

if __name__ == "__main__":
    success = test_live_detection()
    sys.exit(0 if success else 1)
