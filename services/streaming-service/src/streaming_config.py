"""
Streaming Configuration

Configuration for streaming service including WebRTC and LL-HLS settings.
"""
import os
import logging
from typing import Optional
from enum import Enum

logger = logging.getLogger(__name__)


class StreamingProtocol(str, Enum):
    """Streaming protocol types"""
    WEBRTC = "webrtc"
    LL_HLS = "ll_hls"


class StreamingConfig:
    """
    Configuration for streaming service.
    
    Determines which protocol to use based on camera count and site requirements.
    """
    
    def __init__(
        self,
        small_site_threshold: int = 10,
        webrtc_enabled: bool = True,
        ll_hls_enabled: bool = True,
        rtmp_port: int = 1935,
        hls_port: int = 8080,
        webrtc_port: int = 8081,
        hls_segment_duration: float = 2.0,
        hls_segment_count: int = 3
    ):
        """
        Initialize streaming configuration.
        
        Args:
            small_site_threshold: Maximum cameras for small site (WebRTC) (default: 10)
            webrtc_enabled: Enable WebRTC streaming (default: True)
            ll_hls_enabled: Enable LL-HLS streaming (default: True)
            rtmp_port: RTMP server port (default: 1935)
            hls_port: HLS server port (default: 8080)
            webrtc_port: WebRTC signaling port (default: 8081)
            hls_segment_duration: HLS segment duration in seconds (default: 2.0)
            hls_segment_count: Number of HLS segments (default: 3)
        """
        self.small_site_threshold = small_site_threshold
        self.webrtc_enabled = webrtc_enabled
        self.ll_hls_enabled = ll_hls_enabled
        self.rtmp_port = rtmp_port
        self.hls_port = hls_port
        self.webrtc_port = webrtc_port
        self.hls_segment_duration = hls_segment_duration
        self.hls_segment_count = hls_segment_count
    
    @classmethod
    def from_env(cls) -> 'StreamingConfig':
        """Create configuration from environment variables"""
        return cls(
            small_site_threshold=int(os.getenv('SMALL_SITE_THRESHOLD', '10')),
            webrtc_enabled=os.getenv('WEBRTC_ENABLED', 'true').lower() == 'true',
            ll_hls_enabled=os.getenv('LL_HLS_ENABLED', 'true').lower() == 'true',
            rtmp_port=int(os.getenv('RTMP_PORT', '1935')),
            hls_port=int(os.getenv('HLS_PORT', '8080')),
            webrtc_port=int(os.getenv('WEBRTC_PORT', '8081')),
            hls_segment_duration=float(os.getenv('HLS_SEGMENT_DURATION', '2.0')),
            hls_segment_count=int(os.getenv('HLS_SEGMENT_COUNT', '3'))
        )
    
    def get_protocol_for_camera_count(self, camera_count: int) -> StreamingProtocol:
        """
        Determine streaming protocol based on camera count.
        
        Args:
            camera_count: Number of cameras at the site
            
        Returns:
            StreamingProtocol (WEBRTC for small sites, LL_HLS for larger)
        """
        if camera_count <= self.small_site_threshold and self.webrtc_enabled:
            return StreamingProtocol.WEBRTC
        else:
            return StreamingProtocol.LL_HLS
    
    def should_use_webrtc(self, camera_count: int) -> bool:
        """Check if WebRTC should be used for given camera count"""
        return (
            camera_count <= self.small_site_threshold and
            self.webrtc_enabled
        )
    
    def should_use_ll_hls(self, camera_count: int) -> bool:
        """Check if LL-HLS should be used for given camera count"""
        return (
            camera_count > self.small_site_threshold or
            not self.webrtc_enabled
        )

