"""
Snapshot Capture

Captures JPEG snapshots and optional video clips from camera frames.
"""
import os
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import shutil

logger = logging.getLogger(__name__)


class SnapshotCapture:
    """
    Captures snapshots and video clips from camera frames.
    
    Assumes frames are stored on disk at /tmp/frames/{camera_id}/frame_*.jpg
    """
    
    def __init__(
        self,
        frames_base_path: str = "/tmp/frames",
        clip_duration_seconds: int = 5,
        clip_pre_seconds: int = 2,
        clip_post_seconds: int = 3
    ):
        """
        Initialize snapshot capture.
        
        Args:
            frames_base_path: Base path for camera frames (default: /tmp/frames)
            clip_duration_seconds: Total clip duration in seconds (default: 5)
            clip_pre_seconds: Seconds before violation timestamp (default: 2)
            clip_post_seconds: Seconds after violation timestamp (default: 3)
        """
        self.frames_base_path = Path(frames_base_path)
        self.clip_duration_seconds = clip_duration_seconds
        self.clip_pre_seconds = clip_pre_seconds
        self.clip_post_seconds = clip_post_seconds
    
    def capture_snapshot(
        self,
        camera_id: str,
        violation_timestamp: datetime,
        output_path: str
    ) -> Optional[str]:
        """
        Capture JPEG snapshot from camera at violation timestamp.
        
        Finds the frame closest to violation_timestamp and copies it to output_path.
        
        Args:
            camera_id: Camera identifier
            violation_timestamp: Timestamp of violation (target frame time)
            output_path: Path where snapshot should be saved
            
        Returns:
            Path to captured snapshot if successful, None otherwise
        """
        try:
            # Find frame closest to violation timestamp
            frame_path = self._find_frame_at_timestamp(camera_id, violation_timestamp)
            
            if not frame_path:
                logger.warning(
                    f"No frame found for camera {camera_id} at timestamp {violation_timestamp}"
                )
                return None
            
            # Copy frame to output path
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.copy2(frame_path, output_path)
            
            logger.info(
                f"Captured snapshot",
                extra={
                    'camera_id': camera_id,
                    'violation_timestamp': violation_timestamp.isoformat(),
                    'frame_path': str(frame_path),
                    'output_path': output_path,
                }
            )
            
            return output_path
            
        except Exception as e:
            logger.error(
                f"Failed to capture snapshot: {e}",
                extra={
                    'camera_id': camera_id,
                    'violation_timestamp': violation_timestamp.isoformat(),
                },
                exc_info=True
            )
            return None
    
    def capture_video_clip(
        self,
        camera_id: str,
        violation_timestamp: datetime,
        output_path: str,
        fps: int = 1
    ) -> Optional[str]:
        """
        Capture video clip (5-10 seconds pre/post violation).
        
        Collects frames before and after violation timestamp and creates video clip.
        
        Args:
            camera_id: Camera identifier
            violation_timestamp: Timestamp of violation (center of clip)
            output_path: Path where video clip should be saved
            fps: Frames per second for video (default: 1)
            
        Returns:
            Path to captured video clip if successful, None otherwise
        """
        try:
            # Calculate time range for clip
            clip_start = violation_timestamp - timedelta(seconds=self.clip_pre_seconds)
            clip_end = violation_timestamp + timedelta(seconds=self.clip_post_seconds)
            
            # Find frames in time range
            frame_paths = self._find_frames_in_range(camera_id, clip_start, clip_end)
            
            if not frame_paths:
                logger.warning(
                    f"No frames found for camera {camera_id} in range {clip_start} to {clip_end}"
                )
                return None
            
            # Create video clip from frames using FFmpeg
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            # Create temporary file list for FFmpeg
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                for frame_path in sorted(frame_paths):
                    f.write(f"file '{frame_path}'\n")
                file_list_path = f.name
            
            try:
                # Use FFmpeg to create video from frame sequence
                import subprocess
                result = subprocess.run([
                    'ffmpeg',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', file_list_path,
                    '-r', str(fps),
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-y',  # Overwrite output file
                    str(output_path)
                ], check=True, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"FFmpeg failed: {result.stderr}")
                    return None
                
                logger.info(
                    f"Captured video clip",
                    extra={
                        'camera_id': camera_id,
                        'violation_timestamp': violation_timestamp.isoformat(),
                        'frame_count': len(frame_paths),
                        'output_path': output_path,
                    }
                )
                
                return output_path
                
            finally:
                # Clean up temporary file list
                os.unlink(file_list_path)
            
        except Exception as e:
            logger.error(
                f"Failed to capture video clip: {e}",
                extra={
                    'camera_id': camera_id,
                    'violation_timestamp': violation_timestamp.isoformat(),
                },
                exc_info=True
            )
            return None
    
    def _find_frame_at_timestamp(
        self,
        camera_id: str,
        target_timestamp: datetime
    ) -> Optional[str]:
        """
        Find frame file closest to target timestamp.
        
        Uses frame file modification time to approximate timestamp.
        In production, frame metadata or sequence numbers would be more accurate.
        
        Args:
            camera_id: Camera identifier
            target_timestamp: Target timestamp
            
        Returns:
            Path to frame file if found, None otherwise
        """
        camera_frames_dir = self.frames_base_path / camera_id
        
        if not camera_frames_dir.exists():
            return None
        
        # Get all frame files
        frame_files = list(camera_frames_dir.glob("frame_*.jpg"))
        
        if not frame_files:
            return None
        
        # Find frame closest to target timestamp
        # Use file modification time as approximation
        closest_frame = None
        min_time_diff = None
        
        for frame_file in frame_files:
            try:
                file_mtime = datetime.fromtimestamp(frame_file.stat().st_mtime)
                time_diff = abs((target_timestamp - file_mtime).total_seconds())
                
                if min_time_diff is None or time_diff < min_time_diff:
                    min_time_diff = time_diff
                    closest_frame = frame_file
            except Exception as e:
                logger.debug(f"Error checking frame {frame_file}: {e}")
                continue
        
        # Only return if within reasonable time window (e.g., 10 seconds)
        if closest_frame and min_time_diff and min_time_diff <= 10:
            return str(closest_frame)
        
        return None
    
    def _find_frames_in_range(
        self,
        camera_id: str,
        start_timestamp: datetime,
        end_timestamp: datetime
    ) -> List[str]:
        """
        Find all frame files within time range.
        
        Args:
            camera_id: Camera identifier
            start_timestamp: Start of time range
            end_timestamp: End of time range
            
        Returns:
            List of frame file paths
        """
        camera_frames_dir = self.frames_base_path / camera_id
        
        if not camera_frames_dir.exists():
            return []
        
        frame_files = list(camera_frames_dir.glob("frame_*.jpg"))
        frames_in_range = []
        
        for frame_file in frame_files:
            try:
                file_mtime = datetime.fromtimestamp(frame_file.stat().st_mtime)
                
                if start_timestamp <= file_mtime <= end_timestamp:
                    frames_in_range.append(str(frame_file))
            except Exception as e:
                logger.debug(f"Error checking frame {frame_file}: {e}")
                continue
        
        return sorted(frames_in_range)

