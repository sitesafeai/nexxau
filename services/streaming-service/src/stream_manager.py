"""
Stream Manager

Manages streaming processes for cameras.
Ensures streaming NEVER affects detection by using separate processes.
"""
import logging
import subprocess
import time
from typing import Dict, Optional
from pathlib import Path
import os

from .streaming_config import StreamingProtocol, StreamingConfig

logger = logging.getLogger(__name__)


class StreamProcess:
    """Represents a running stream process"""
    
    def __init__(
        self,
        camera_id: str,
        protocol: StreamingProtocol,
        process: subprocess.Popen,
        input_source: str
    ):
        self.camera_id = camera_id
        self.protocol = protocol
        self.process = process
        self.input_source = input_source
        self.started_at = time.time()
        self.restart_count = 0


class StreamManager:
    """
    Manages streaming processes for cameras.
    
    Key principle: Streaming processes are completely separate from detection.
    - Detection uses camera frames from /tmp/frames
    - Streaming processes read directly from RTSP source
    - No shared resources or interference
    """
    
    def __init__(
        self,
        config: StreamingConfig,
        frames_base_path: str = "/tmp/frames",
        stream_base_path: str = "/tmp/streams"
    ):
        """
        Initialize stream manager.
        
        Args:
            config: StreamingConfig instance
            frames_base_path: Base path for camera frames (for detection)
            stream_base_path: Base path for stream outputs (HLS segments, etc.)
        """
        self.config = config
        self.frames_base_path = Path(frames_base_path)
        self.stream_base_path = Path(stream_base_path)
        self.stream_base_path.mkdir(parents=True, exist_ok=True)
        
        # Track active stream processes
        self._streams: Dict[str, StreamProcess] = {}
    
    def start_stream(
        self,
        camera_id: str,
        rtsp_url: str,
        protocol: Optional[StreamingProtocol] = None,
        camera_count: int = 1
    ) -> bool:
        """
        Start streaming process for camera.
        
        IMPORTANT: This process is separate from detection.
        Detection continues to read frames from /tmp/frames independently.
        
        Args:
            camera_id: Camera identifier
            rtsp_url: RTSP source URL
            protocol: Streaming protocol (auto-selected if None)
            camera_count: Number of cameras at site (for protocol selection)
            
        Returns:
            True if stream started successfully, False otherwise
        """
        try:
            # Determine protocol if not specified
            if protocol is None:
                protocol = self.config.get_protocol_for_camera_count(camera_count)
            
            # Check if stream already exists
            if camera_id in self._streams:
                logger.warning(f"Stream already exists for camera {camera_id}")
                return False
            
            # Start stream process based on protocol
            if protocol == StreamingProtocol.WEBRTC:
                process = self._start_webrtc_stream(camera_id, rtsp_url)
            elif protocol == StreamingProtocol.LL_HLS:
                process = self._start_ll_hls_stream(camera_id, rtsp_url)
            else:
                logger.error(f"Unknown protocol: {protocol}")
                return False
            
            if process:
                self._streams[camera_id] = StreamProcess(
                    camera_id=camera_id,
                    protocol=protocol,
                    process=process,
                    input_source=rtsp_url
                )
                logger.info(
                    f"Started {protocol.value} stream for camera {camera_id}",
                    extra={
                        'camera_id': camera_id,
                        'protocol': protocol.value,
                        'rtsp_url': rtsp_url,
                    }
                )
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(
                f"Failed to start stream for camera {camera_id}: {e}",
                extra={'camera_id': camera_id},
                exc_info=True
            )
            return False
    
    def stop_stream(self, camera_id: str) -> bool:
        """Stop streaming process for camera"""
        try:
            if camera_id not in self._streams:
                logger.warning(f"No stream found for camera {camera_id}")
                return False
            
            stream = self._streams[camera_id]
            process = stream.process
            
            # Terminate process
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            
            del self._streams[camera_id]
            
            logger.info(f"Stopped stream for camera {camera_id}")
            return True
            
        except Exception as e:
            logger.error(
                f"Failed to stop stream for camera {camera_id}: {e}",
                extra={'camera_id': camera_id},
                exc_info=True
            )
            return False
    
    def _start_webrtc_stream(
        self,
        camera_id: str,
        rtsp_url: str
    ) -> Optional[subprocess.Popen]:
        """
        Start WebRTC stream process.
        
        Uses GStreamer or similar for RTSP → WebRTC conversion.
        Process runs independently and doesn't affect detection.
        """
        try:
            # WebRTC streaming using GStreamer
            # This is a placeholder - actual implementation depends on WebRTC server choice
            # Options: Janus, Kurento, GStreamer, etc.
            
            # Example: GStreamer pipeline for RTSP → WebRTC
            # gst-launch-1.0 rtspsrc location=rtsp_url ! rtph264depay ! h264parse ! webrtcsink
            
            # For now, return None (implementation depends on WebRTC server architecture)
            logger.info(
                f"WebRTC stream start requested for camera {camera_id}",
                extra={'camera_id': camera_id, 'rtsp_url': rtsp_url}
            )
            
            # Placeholder: In production, start actual WebRTC process
            # process = subprocess.Popen([
            #     'gst-launch-1.0',
            #     'rtspsrc', f'location={rtsp_url}',
            #     '!', 'rtph264depay',
            #     '!', 'h264parse',
            #     '!', 'webrtcsink'
            # ])
            
            return None  # Placeholder
            
        except Exception as e:
            logger.error(f"Failed to start WebRTC stream: {e}", exc_info=True)
            return None
    
    def _start_ll_hls_stream(
        self,
        camera_id: str,
        rtsp_url: str
    ) -> Optional[subprocess.Popen]:
        """
        Start LL-HLS stream process.
        
        Uses FFmpeg to convert RTSP → RTMP → LL-HLS.
        Process runs independently and doesn't affect detection.
        """
        try:
            # Create output directory for HLS segments
            hls_output_dir = self.stream_base_path / camera_id
            hls_output_dir.mkdir(parents=True, exist_ok=True)
            
            hls_playlist = hls_output_dir / "playlist.m3u8"
            hls_segment = hls_output_dir / "segment_%03d.ts"
            
            # FFmpeg command for RTSP → LL-HLS
            # Low latency HLS settings: short segments, low latency mode
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', rtsp_url,
                '-c:v', 'libx264',
                '-preset', 'veryfast',  # Fast encoding
                '-tune', 'zerolatency',  # Zero latency tuning
                '-g', '30',  # GOP size
                '-sc_threshold', '0',
                '-f', 'hls',
                '-hls_time', str(self.config.hls_segment_duration),
                '-hls_list_size', str(self.config.hls_segment_count),
                '-hls_flags', 'delete_segments+independent_segments',
                '-hls_segment_type', 'mpegts',
                '-hls_segment_filename', str(hls_segment),
                '-hls_playlist_type', 'vod',  # For LL-HLS, use 'event' or 'vod'
                '-start_number', '0',
                str(hls_playlist)
            ]
            
            # Start FFmpeg process
            process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL  # Prevent stdin interaction
            )
            
            logger.info(
                f"Started LL-HLS stream process",
                extra={
                    'camera_id': camera_id,
                    'pid': process.pid,
                    'hls_playlist': str(hls_playlist),
                }
            )
            
            return process
            
        except Exception as e:
            logger.error(f"Failed to start LL-HLS stream: {e}", exc_info=True)
            return None
    
    def get_stream_url(
        self,
        camera_id: str,
        base_url: str = "http://localhost:8080"
    ) -> Optional[str]:
        """
        Get streaming URL for camera.
        
        Args:
            camera_id: Camera identifier
            base_url: Base URL for streaming server
            
        Returns:
            Streaming URL if stream exists, None otherwise
        """
        if camera_id not in self._streams:
            return None
        
        stream = self._streams[camera_id]
        
        if stream.protocol == StreamingProtocol.WEBRTC:
            # WebRTC signaling URL
            return f"{base_url}/webrtc/{camera_id}"
        elif stream.protocol == StreamingProtocol.LL_HLS:
            # HLS playlist URL
            return f"{base_url}/hls/{camera_id}/playlist.m3u8"
        else:
            return None
    
    def is_stream_active(self, camera_id: str) -> bool:
        """Check if stream is active"""
        if camera_id not in self._streams:
            return False
        
        stream = self._streams[camera_id]
        return stream.process.poll() is None  # Process still running
    
    def get_active_streams(self) -> Dict[str, StreamProcess]:
        """Get all active streams"""
        # Filter out dead processes
        active = {}
        for camera_id, stream in list(self._streams.items()):
            if stream.process.poll() is None:
                active[camera_id] = stream
            else:
                logger.warning(f"Stream process for camera {camera_id} has died")
                del self._streams[camera_id]
        
        return active

