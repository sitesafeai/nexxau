"""
Health Monitor

Monitors stream health and availability metrics.
"""
import logging
import time
from typing import Dict, List
from datetime import datetime
from prometheus_client import Gauge, Counter, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics
streams_active_total = Gauge(
    'streams_active_total',
    'Total number of active streams',
    ['protocol', 'worksite_id']
)

stream_uptime_seconds = Histogram(
    'stream_uptime_seconds',
    'Stream uptime in seconds',
    buckets=[60, 300, 900, 3600, 86400],
    labelnames=['camera_id', 'protocol']
)

stream_restarts_total = Counter(
    'stream_restarts_total',
    'Total number of stream restarts',
    ['camera_id', 'protocol']
)

stream_availability = Gauge(
    'stream_availability',
    'Stream availability (1 = available, 0 = unavailable)',
    ['camera_id', 'protocol']
)


class HealthMonitor:
    """
    Monitors stream health and availability.
    
    Tracks:
    - Stream availability status
    - Stream uptime
    - Stream restarts
    - Protocol-specific metrics
    """
    
    def __init__(self):
        """Initialize health monitor"""
        self._stream_health: Dict[str, Dict] = {}
    
    def record_stream_start(
        self,
        camera_id: str,
        protocol: str,
        worksite_id: str
    ) -> None:
        """
        Record stream start.
        
        Args:
            camera_id: Camera identifier
            protocol: Streaming protocol (webrtc, ll_hls)
            worksite_id: Worksite identifier
        """
        self._stream_health[camera_id] = {
            'protocol': protocol,
            'worksite_id': worksite_id,
            'started_at': time.time(),
            'last_health_check': time.time(),
            'restart_count': 0,
            'is_available': True
        }
        
        # Update metrics
        streams_active_total.labels(
            protocol=protocol,
            worksite_id=worksite_id
        ).inc()
        
        stream_availability.labels(
            camera_id=camera_id,
            protocol=protocol
        ).set(1)
        
        logger.info(
            f"Stream health monitoring started",
            extra={
                'camera_id': camera_id,
                'protocol': protocol,
                'worksite_id': worksite_id,
            }
        )
    
    def record_stream_stop(self, camera_id: str) -> None:
        """
        Record stream stop.
        
        Args:
            camera_id: Camera identifier
        """
        if camera_id not in self._stream_health:
            return
        
        health = self._stream_health[camera_id]
        protocol = health['protocol']
        worksite_id = health['worksite_id']
        
        # Calculate uptime
        uptime = time.time() - health['started_at']
        stream_uptime_seconds.labels(
            camera_id=camera_id,
            protocol=protocol
        ).observe(uptime)
        
        # Update metrics
        streams_active_total.labels(
            protocol=protocol,
            worksite_id=worksite_id
        ).dec()
        
        stream_availability.labels(
            camera_id=camera_id,
            protocol=protocol
        ).set(0)
        
        del self._stream_health[camera_id]
        
        logger.info(
            f"Stream health monitoring stopped",
            extra={
                'camera_id': camera_id,
                'uptime_seconds': uptime,
            }
        )
    
    def record_stream_restart(self, camera_id: str) -> None:
        """
        Record stream restart.
        
        Args:
            camera_id: Camera identifier
        """
        if camera_id not in self._stream_health:
            return
        
        health = self._stream_health[camera_id]
        protocol = health['protocol']
        
        health['restart_count'] += 1
        health['started_at'] = time.time()  # Reset start time
        
        stream_restarts_total.labels(
            camera_id=camera_id,
            protocol=protocol
        ).inc()
        
        logger.warning(
            f"Stream restarted",
            extra={
                'camera_id': camera_id,
                'protocol': protocol,
                'restart_count': health['restart_count'],
            }
        )
    
    def check_stream_health(
        self,
        camera_id: str,
        is_available: bool
    ) -> None:
        """
        Check and record stream health.
        
        Args:
            camera_id: Camera identifier
            is_available: Whether stream is currently available
        """
        if camera_id not in self._stream_health:
            return
        
        health = self._stream_health[camera_id]
        protocol = health['protocol']
        
        health['last_health_check'] = time.time()
        health['is_available'] = is_available
        
        # Update availability metric
        stream_availability.labels(
            camera_id=camera_id,
            protocol=protocol
        ).set(1 if is_available else 0)
        
        if not is_available:
            logger.warning(
                f"Stream health check failed",
                extra={
                    'camera_id': camera_id,
                    'protocol': protocol,
                }
            )
    
    def get_stream_health(self, camera_id: str) -> Dict:
        """Get stream health information"""
        if camera_id not in self._stream_health:
            return {}
        
        health = self._stream_health[camera_id]
        current_time = time.time()
        
        return {
            'camera_id': camera_id,
            'protocol': health['protocol'],
            'worksite_id': health['worksite_id'],
            'uptime_seconds': current_time - health['started_at'],
            'restart_count': health['restart_count'],
            'is_available': health['is_available'],
            'last_health_check': health['last_health_check'],
        }
    
    def get_all_stream_health(self) -> List[Dict]:
        """Get health information for all streams"""
        return [
            self.get_stream_health(camera_id)
            for camera_id in self._stream_health.keys()
        ]

