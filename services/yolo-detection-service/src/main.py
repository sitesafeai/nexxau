"""
Main entrypoint for YOLO detection service.

One service. One process. One thread per camera.
Central loop manages all cameras.

NOT one Docker container per camera - that leads to orchestration hell at 40 cameras.
"""

import os
import sys
import time
import logging
import threading
from typing import Dict, Optional
from flask import Flask
import requests

from stream_reader import HardenedStreamReader
from detector import YOLODetector
from nexxau_client import NexxauClient
from health import HealthMonitor, create_health_endpoint
from notifier import set_notifications_enabled, notify_person_detected

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


class CameraWorker:
    """
    Worker for a single camera.
    
    Runs in its own thread. Manages:
    - Stream reading (with reconnect)
    - YOLO inference (with FPS limiting)
    - Posting detections to Nexxau
    """
    
    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        camera_name: str,
        person_alerts_enabled: bool,
        detector: YOLODetector,
        nexxau_client: NexxauClient,
        health_monitor: HealthMonitor,
    ):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.camera_name = camera_name or "Camera"
        self.person_alerts_enabled = person_alerts_enabled
        self.detector = detector
        self.nexxau_client = nexxau_client
        self.health_monitor = health_monitor
        
        # Create hardened stream reader
        self.stream_reader = HardenedStreamReader(
            camera_id=camera_id,
            rtsp_url=rtsp_url,
        )
        
        self.thread: Optional[threading.Thread] = None
        self.running = False
        
        logger.info(f"[{camera_id}] CameraWorker created")
    
    def start(self):
        """Start the camera worker thread."""
        if self.running:
            logger.warning(f"[{self.camera_id}] Worker already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        
        # Register with health monitor
        self.health_monitor.register_worker(self.camera_id, self)
        
        logger.info(f"[{self.camera_id}] Worker started")
    
    def stop(self):
        """Stop the camera worker thread."""
        if not self.running:
            return
        
        logger.info(f"[{self.camera_id}] Stopping worker...")
        self.running = False
        
        # Unregister from health monitor
        self.health_monitor.unregister_worker(self.camera_id)
        
        # Wait for thread to finish (with timeout)
        if self.thread is not None:
            self.thread.join(timeout=5)
        
        # Release stream reader
        self.stream_reader.release()
        
        logger.info(f"[{self.camera_id}] Worker stopped")
    
    def _run_loop(self):
        """
        Main loop for camera worker.
        
        Tight loop:
        1. Read frame (with auto-reconnect on failure)
        2. Check if inference should run (time-based FPS limiting)
        3. Run YOLO inference if due
        4. Send detection to Nexxau
        """
        logger.info(f"[{self.camera_id}] Worker loop started")
        
        frame_count = 0
        
        while self.running:
            try:
                # Read frame (auto-reconnect on failure)
                success, frame = self.stream_reader.read_frame()
                
                if not success or frame is None:
                    # Failed to read frame, stream_reader will handle reconnect
                    time.sleep(0.1)  # Brief sleep to avoid tight loop on persistent failure
                    continue
                
                frame_count += 1
                
                # Check if we should run inference (time-based FPS limiting)
                if not self.detector.should_run_inference():
                    # Too soon since last inference, skip
                    time.sleep(0.01)  # Brief sleep to avoid burning CPU
                    continue
                
                # Run YOLO inference
                detections = self.detector.detect(frame)
                
                # Log detections periodically
                if frame_count % 100 == 0:
                    logger.info(
                        f"[{self.camera_id}] Processed {frame_count} frames. "
                        f"Recent detection: {len(detections)} objects"
                    )
                
                # Send detection to Nexxau (only if we have detections or every Nth frame)
                # For now, always send to maintain heartbeat
                self.nexxau_client.send_detection(
                    camera_id=self.camera_id,
                    detections=detections,
                    frame=frame,
                    include_frame=(len(detections) > 0),  # Only include frame if detections
                )

                # Per-camera SMS alerts when person detected (Twilio)
                person_count = sum(1 for d in detections if d.get("class_name") == "person")
                if person_count > 0 and self.person_alerts_enabled:
                    notify_person_detected(self.camera_name, self.camera_id, person_count)
                
            except Exception as e:
                logger.error(f"[{self.camera_id}] Exception in worker loop: {e}", exc_info=True)
                time.sleep(1)  # Sleep on exception to avoid tight loop
        
        logger.info(f"[{self.camera_id}] Worker loop ended")


class DetectionService:
    """
    Main detection service.
    
    One process. Manages multiple camera workers (one thread each).
    """
    
    def __init__(self):
        # Get config from environment
        self.nexxau_api_url = os.getenv("NEXXAU_API_URL", "http://localhost:3000")
        self.go2rtc_restream_base = os.getenv("GO2RTC_RESTREAM_BASE", "rtsp://localhost:8554")
        self.detection_fps = float(os.getenv("DETECTION_FPS", "3.0"))
        self.yolo_model = os.getenv("YOLO_MODEL", "yolov8n.pt")
        
        # Initialize shared components
        self.detector = YOLODetector(
            model_path=self.yolo_model,
            target_fps=self.detection_fps,
        )
        self.nexxau_client = NexxauClient(api_url=self.nexxau_api_url)
        self.health_monitor = HealthMonitor()
        
        # Camera workers
        self.workers: Dict[str, CameraWorker] = {}
        
        logger.info("DetectionService initialized")
        logger.info(f"  Nexxau API: {self.nexxau_api_url}")
        logger.info(f"  go2rtc restream: {self.go2rtc_restream_base}")
        logger.info(f"  Detection FPS: {self.detection_fps}")
        logger.info(f"  YOLO model: {self.yolo_model}")
    
    def add_camera(
        self,
        camera_id: str,
        camera_rtsp_url: Optional[str] = None,
        camera_name: Optional[str] = None,
        person_alerts_enabled: bool = False,
    ):
        """
        Add a camera to the service.
        
        Creates and starts a new worker thread for the camera.
        
        Args:
            camera_id: Camera identifier (used as go2rtc stream name)
            camera_rtsp_url: Optional direct RTSP URL (if not using go2rtc)
            camera_name: Display name for notifications
            person_alerts_enabled: Whether to send SMS when person detected
        """
        if camera_id in self.workers:
            logger.warning(f"Camera {camera_id} already exists")
            return
        
        # Determine RTSP URL
        if camera_rtsp_url:
            rtsp_url = camera_rtsp_url
        else:
            # Use go2rtc restream: rtsp://go2rtc:8554/{cameraId}
            rtsp_url = f"{self.go2rtc_restream_base}/{camera_id}"
        
        set_notifications_enabled(camera_id, person_alerts_enabled)
        logger.info(f"Adding camera: {camera_id} -> {rtsp_url} (alerts={'on' if person_alerts_enabled else 'off'})")
        
        # Create worker
        worker = CameraWorker(
            camera_id=camera_id,
            rtsp_url=rtsp_url,
            camera_name=camera_name or "Camera",
            person_alerts_enabled=person_alerts_enabled,
            detector=self.detector,
            nexxau_client=self.nexxau_client,
            health_monitor=self.health_monitor,
        )
        
        # Start worker
        worker.start()
        
        # Store worker
        self.workers[camera_id] = worker
        
        logger.info(f"Camera {camera_id} added and started")
    
    def remove_camera(self, camera_id: str):
        """
        Remove a camera from the service.
        
        Stops the worker thread for the camera.
        """
        if camera_id not in self.workers:
            logger.warning(f"Camera {camera_id} not found")
            return
        
        logger.info(f"Removing camera: {camera_id}")
        
        # Stop worker
        worker = self.workers[camera_id]
        worker.stop()
        
        # Remove from dict
        del self.workers[camera_id]
        
        logger.info(f"Camera {camera_id} removed")
    
    def sync_cameras_from_nexxau(self):
        """
        Sync camera list from Nexxau API.
        
        Polls Nexxau for camera list and adds/removes workers as needed.
        """
        try:
            # Fetch cameras from Nexxau internal endpoint
            internal_token = os.getenv("INTERNAL_SERVICE_TOKEN", "")
            headers = {
                "Authorization": f"Bearer {internal_token}",
            }
            
            response = requests.get(
                f"{self.nexxau_api_url}/api/cameras/list-for-detection",
                headers=headers,
                timeout=10,
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch cameras from Nexxau: {response.status_code}")
                return
            
            data = response.json()
            cameras = data.get("cameras", [])
            
            # Get current camera IDs from Nexxau
            nexxau_camera_ids = set(cam["id"] for cam in cameras if cam.get("id"))
            
            # Get current worker IDs
            worker_ids = set(self.workers.keys())
            
            # Add new cameras
            cam_by_id = {c["id"]: c for c in cameras if c.get("id")}
            for camera_id in nexxau_camera_ids - worker_ids:
                cam = cam_by_id.get(camera_id, {})
                self.add_camera(
                    camera_id,
                    camera_rtsp_url=cam.get("rtspUrl"),
                    camera_name=cam.get("name"),
                    person_alerts_enabled=cam.get("personAlertsEnabled", False),
                )
            
            # Remove cameras that no longer exist
            for camera_id in worker_ids - nexxau_camera_ids:
                set_notifications_enabled(camera_id, False)
                self.remove_camera(camera_id)

            # Update notifications_enabled for existing cameras (runtime toggle)
            for cam in cameras:
                cid = cam.get("id")
                if cid and cid in self.workers:
                    set_notifications_enabled(cid, cam.get("personAlertsEnabled", False))
            
            logger.info(f"Camera sync complete. Active cameras: {len(self.workers)}")
            
        except Exception as e:
            logger.error(f"Error syncing cameras from Nexxau: {e}")
    
    def start(self):
        """Start the detection service."""
        logger.info("Starting detection service...")
        
        # Initial camera sync
        self.sync_cameras_from_nexxau()
        
        # Start Flask app for health and notifications endpoints
        app = Flask(__name__)
        app.route('/health')(create_health_endpoint(self.health_monitor))

        @app.route('/notifications/<camera_id>', methods=['PATCH'])
        def patch_notifications(camera_id: str):
            """Update notifications for a camera (runtime toggle without waiting for sync)."""
            try:
                from flask import request
                data = request.get_json(force=True, silent=True) or {}
                enabled = data.get('notifications_enabled', data.get('enabled', False))
                set_notifications_enabled(camera_id, bool(enabled))
                return {'status': 'ok', 'camera_id': camera_id, 'notifications_enabled': bool(enabled)}
            except Exception as e:
                return {'status': 'error', 'error': str(e)}, 500
        
        # Start periodic camera sync in background thread
        def periodic_sync():
            while True:
                time.sleep(60)  # Sync every 60 seconds
                self.sync_cameras_from_nexxau()
        
        sync_thread = threading.Thread(target=periodic_sync, daemon=True)
        sync_thread.start()
        
        logger.info("Detection service started. Health endpoint: http://0.0.0.0:5000/health")
        
        # Run Flask app
        app.run(host='0.0.0.0', port=5000)


def main():
    """Main entrypoint."""
    logger.info("=" * 80)
    logger.info("YOLO Detection Service - Hardened 24/7 Operation")
    logger.info("=" * 80)
    
    service = DetectionService()
    
    try:
        service.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        # Stop all workers
        for camera_id in list(service.workers.keys()):
            service.remove_camera(camera_id)
        logger.info("Shutdown complete")


if __name__ == "__main__":
    main()
