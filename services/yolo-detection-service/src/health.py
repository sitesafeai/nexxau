"""
Health monitoring endpoint and metrics aggregation.

Aggregates per-camera metrics into /health response.
No lies - exposes real system state for observability.
"""

import logging
from typing import Dict, List
from datetime import datetime
from flask import jsonify

logger = logging.getLogger(__name__)


class HealthMonitor:
    """
    Aggregates metrics from all camera workers for health endpoint.
    
    Implements section 2.4 of the plan:
    - Overall status: healthy / degraded / unhealthy
    - Per-camera metrics: reconnect_count, avg_inference_time_ms, dropped_frame_count, etc.
    - Failure semantics: 3 failures = degraded, 10 failures = unhealthy
    """
    
    def __init__(self):
        self.camera_workers: Dict[str, "CameraWorker"] = {}
        logger.info("HealthMonitor initialized")
    
    def register_worker(self, camera_id: str, worker: "CameraWorker"):
        """Register a camera worker for monitoring."""
        self.camera_workers[camera_id] = worker
        logger.info(f"Registered worker for camera: {camera_id}")
    
    def unregister_worker(self, camera_id: str):
        """Unregister a camera worker."""
        if camera_id in self.camera_workers:
            del self.camera_workers[camera_id]
            logger.info(f"Unregistered worker for camera: {camera_id}")
    
    def get_camera_health(self, camera_id: str, worker: "CameraWorker") -> Dict:
        """
        Get health status for a single camera.
        
        Returns dict with:
        - cameraId
        - status: healthy/degraded/unhealthy
        - lastFrameAt
        - reconnectCount
        - avgInferenceTimeMs
        - droppedFrameCount
        - actualFps
        - consecutiveFailures
        """
        stream_metrics = worker.stream_reader.get_metrics()
        detector_metrics = worker.detector.get_metrics()
        
        # Determine status based on consecutive failures
        if stream_metrics.consecutive_failures == 0:
            status = "healthy"
        elif stream_metrics.consecutive_failures < 3:
            status = "healthy"  # Still recovering
        elif stream_metrics.consecutive_failures < 10:
            status = "degraded"
        else:
            status = "unhealthy"
        
        return {
            "cameraId": camera_id,
            "status": status,
            "lastFrameAt": stream_metrics.last_successful_frame_timestamp.isoformat() 
                          if stream_metrics.last_successful_frame_timestamp else None,
            "reconnectCount": stream_metrics.reconnect_count,
            "avgInferenceTimeMs": round(detector_metrics.get_avg_inference_time_ms(), 2),
            "droppedFrameCount": stream_metrics.dropped_frame_count,
            "actualFps": round(detector_metrics.actual_fps_achieved, 2),
            "consecutiveFailures": stream_metrics.consecutive_failures,
        }
    
    def get_overall_status(self, camera_statuses: List[Dict]) -> str:
        """
        Determine overall service status from camera statuses.
        
        Overall status = worst status across all cameras:
        - If any unhealthy → unhealthy
        - Else if any degraded → degraded
        - Else → healthy
        """
        if not camera_statuses:
            return "healthy"
        
        statuses = [cam["status"] for cam in camera_statuses]
        
        if "unhealthy" in statuses:
            return "unhealthy"
        elif "degraded" in statuses:
            return "degraded"
        else:
            return "healthy"
    
    def get_health_response(self) -> Dict:
        """
        Generate health response for /health endpoint.
        
        Returns comprehensive health data per plan section 2.4:
        - service: overall status
        - cameras: per-camera metrics
        - summary: aggregate counts
        """
        camera_statuses = []
        
        for camera_id, worker in self.camera_workers.items():
            try:
                camera_health = self.get_camera_health(camera_id, worker)
                camera_statuses.append(camera_health)
            except Exception as e:
                logger.error(f"Error getting health for camera {camera_id}: {e}")
                camera_statuses.append({
                    "cameraId": camera_id,
                    "status": "unhealthy",
                    "error": str(e),
                })
        
        # Calculate summary
        total_cameras = len(camera_statuses)
        healthy_count = sum(1 for cam in camera_statuses if cam["status"] == "healthy")
        degraded_count = sum(1 for cam in camera_statuses if cam["status"] == "degraded")
        unhealthy_count = sum(1 for cam in camera_statuses if cam["status"] == "unhealthy")
        
        overall_status = self.get_overall_status(camera_statuses)
        
        return {
            "service": {
                "name": "yolo-detection-service",
                "status": overall_status,
                "timestamp": datetime.now().isoformat(),
            },
            "cameras": camera_statuses,
            "summary": {
                "total": total_cameras,
                "healthy": healthy_count,
                "degraded": degraded_count,
                "unhealthy": unhealthy_count,
            },
        }


def create_health_endpoint(health_monitor: HealthMonitor):
    """
    Create Flask health endpoint handler.
    
    Usage with Flask:
        from health import create_health_endpoint
        app.route('/health')(create_health_endpoint(health_monitor))
    """
    def health():
        response = health_monitor.get_health_response()
        status_code = 200
        
        # Return 503 if service is unhealthy
        if response["service"]["status"] == "unhealthy":
            status_code = 503
        
        return jsonify(response), status_code
    
    return health
