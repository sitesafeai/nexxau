"""
Snapshot Processor

Main orchestrator for snapshot capture and storage.
"""
import os
import logging
import tempfile
from typing import Optional
from datetime import datetime
from pathlib import Path

from .violation_consumer import ViolationStateChange
from .snapshot_capture import SnapshotCapture
from .s3_storage import S3Storage
from .snapshot_repository import SnapshotRepository
from .storage_limit_manager import StorageLimitManager

logger = logging.getLogger(__name__)


class SnapshotProcessor:
    """
    Processes violation state changes and captures snapshots/clips.
    """
    
    def __init__(
        self,
        snapshot_capture: SnapshotCapture,
        s3_storage: S3Storage,
        snapshot_repository: SnapshotRepository,
        storage_limit_manager: Optional[StorageLimitManager] = None,
        capture_clips: bool = True,
        signed_url_ttl_seconds: int = 3600
    ):
        """
        Initialize snapshot processor.
        
        Args:
            snapshot_capture: SnapshotCapture instance
            s3_storage: S3Storage instance
            snapshot_repository: SnapshotRepository instance
            capture_clips: Whether to capture video clips (default: True)
            signed_url_ttl_seconds: TTL for signed URLs in seconds (default: 3600)
        """
        self.snapshot_capture = snapshot_capture
        self.s3_storage = s3_storage
        self.repository = snapshot_repository
        self.storage_limit_manager = storage_limit_manager
        self.capture_clips = capture_clips
        self.signed_url_ttl_seconds = signed_url_ttl_seconds
    
    def process_violation_state_change(
        self,
        state_change: ViolationStateChange
    ) -> dict:
        """
        Process violation state change and capture snapshot/clip.
        
        Args:
            state_change: Violation state change event
            
        Returns:
            Dictionary with snapshot metadata and signed URLs
        """
        result = {
            'violation_id': state_change.violation_id,
            'snapshot_captured': False,
            'clip_captured': False,
            'snapshot_url': None,
            'clip_url': None,
            'error': None
        }
        
        # Check storage limit before capture
        if self.storage_limit_manager and not self.storage_limit_manager.is_snapshot_allowed():
            storage_status = {
                'storage_limit_exceeded': True,
                'current_usage_percent': getattr(self.storage_limit_manager, 'current_usage_percent', None)
            }
            logger.warning(
                "Snapshot disabled due to storage limit",
                extra=storage_status
            )
            result['error'] = 'storage_limit_exceeded'
            return result
        
        try:
            # Capture snapshot
            snapshot_result = self._capture_and_store_snapshot(state_change)
            if snapshot_result:
                result['snapshot_captured'] = True
                result['snapshot_url'] = snapshot_result.get('signed_url')
                result['snapshot_id'] = snapshot_result.get('snapshot_id')
            
            # Capture video clip (if enabled)
            if self.capture_clips:
                clip_result = self._capture_and_store_clip(state_change)
                if clip_result:
                    result['clip_captured'] = True
                    result['clip_url'] = clip_result.get('signed_url')
                    result['clip_id'] = clip_result.get('snapshot_id')
            
        except Exception as e:
            logger.error(
                f"Error processing violation state change: {e}",
                extra={
                    'violation_id': state_change.violation_id,
                    'camera_id': state_change.camera_id,
                },
                exc_info=True
            )
            result['error'] = str(e)
        
        return result
    
    def _capture_and_store_snapshot(
        self,
        state_change: ViolationStateChange
    ) -> Optional[dict]:
        """Capture snapshot and store in S3"""
        # Create temporary file for snapshot
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
            tmp_snapshot_path = tmp_file.name
        
        try:
            # Capture snapshot
            snapshot_path = self.snapshot_capture.capture_snapshot(
                camera_id=state_change.camera_id,
                violation_timestamp=state_change.timestamp_dt,
                output_path=tmp_snapshot_path
            )
            
            if not snapshot_path:
                return None
            
            # Get file size
            file_size = os.path.getsize(snapshot_path)
            
            # Generate S3 key
            s3_key = self.s3_storage.get_s3_key(
                tenant_id=state_change.tenant_id,
                worksite_id=state_change.worksite_id,
                violation_id=state_change.violation_id,
                filename='snapshot.jpg'
            )
            
            # Upload to S3
            upload_success = self.s3_storage.upload_file(
                local_path=snapshot_path,
                s3_key=s3_key,
                content_type='image/jpeg'
            )
            
            if not upload_success:
                return None
            
            # Generate signed URL
            signed_url = self.s3_storage.generate_signed_url(
                s3_key=s3_key,
                expiration_seconds=self.signed_url_ttl_seconds
            )
            
            # Store metadata in database
            snapshot_id = self.repository.create_snapshot_metadata(
                violation_id=state_change.violation_id,
                tenant_id=state_change.tenant_id,
                worksite_id=state_change.worksite_id,
                camera_id=state_change.camera_id,
                snapshot_type='snapshot',
                s3_key=s3_key,
                s3_bucket=self.s3_storage.bucket_name,
                file_size_bytes=file_size,
                content_type='image/jpeg',
                violation_timestamp=state_change.timestamp_dt
            )
            
            return {
                'snapshot_id': snapshot_id,
                's3_key': s3_key,
                'signed_url': signed_url,
                'file_size': file_size
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_snapshot_path):
                os.unlink(tmp_snapshot_path)
    
    def _capture_and_store_clip(
        self,
        state_change: ViolationStateChange
    ) -> Optional[dict]:
        """Capture video clip and store in S3"""
        # Create temporary file for clip
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
            tmp_clip_path = tmp_file.name
        
        try:
            # Capture video clip
            clip_path = self.snapshot_capture.capture_video_clip(
                camera_id=state_change.camera_id,
                violation_timestamp=state_change.timestamp_dt,
                output_path=tmp_clip_path
            )
            
            if not clip_path:
                return None
            
            # Get file size
            file_size = os.path.getsize(clip_path)
            
            # Generate S3 key
            s3_key = self.s3_storage.get_s3_key(
                tenant_id=state_change.tenant_id,
                worksite_id=state_change.worksite_id,
                violation_id=state_change.violation_id,
                filename='clip.mp4'
            )
            
            # Upload to S3
            upload_success = self.s3_storage.upload_file(
                local_path=clip_path,
                s3_key=s3_key,
                content_type='video/mp4'
            )
            
            if not upload_success:
                return None
            
            # Generate signed URL
            signed_url = self.s3_storage.generate_signed_url(
                s3_key=s3_key,
                expiration_seconds=self.signed_url_ttl_seconds
            )
            
            # Store metadata in database
            snapshot_id = self.repository.create_snapshot_metadata(
                violation_id=state_change.violation_id,
                tenant_id=state_change.tenant_id,
                worksite_id=state_change.worksite_id,
                camera_id=state_change.camera_id,
                snapshot_type='clip',
                s3_key=s3_key,
                s3_bucket=self.s3_storage.bucket_name,
                file_size_bytes=file_size,
                content_type='video/mp4',
                violation_timestamp=state_change.timestamp_dt
            )
            
            return {
                'snapshot_id': snapshot_id,
                's3_key': s3_key,
                'signed_url': signed_url,
                'file_size': file_size
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_clip_path):
                os.unlink(tmp_clip_path)

