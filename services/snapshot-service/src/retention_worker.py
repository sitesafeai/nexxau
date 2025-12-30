"""
Retention Worker

Background worker for deleting expired snapshots and media files.
"""
import logging
import time
from datetime import datetime, timedelta
from typing import List

from .snapshot_repository import SnapshotRepository, SnapshotMetadata
from .s3_storage import S3Storage

logger = logging.getLogger(__name__)


class RetentionWorker:
    """
    Background worker for snapshot retention management.
    
    Periodically checks for expired snapshots and deletes them from:
    1. S3 storage
    2. PostgreSQL metadata
    """
    
    def __init__(
        self,
        snapshot_repository: SnapshotRepository,
        s3_storage: S3Storage,
        retention_days: int = 30,
        check_interval_seconds: int = 3600  # Check every hour
    ):
        """
        Initialize retention worker.
        
        Args:
            snapshot_repository: SnapshotRepository instance
            s3_storage: S3Storage instance
            retention_days: Retention period in days (default: 30)
            check_interval_seconds: Interval between retention checks (default: 3600)
        """
        self.repository = snapshot_repository
        self.s3_storage = s3_storage
        self.retention_days = retention_days
        self.check_interval_seconds = check_interval_seconds
        self.running = False
    
    def start(self) -> None:
        """Start retention worker loop"""
        self.running = True
        logger.info(f"Starting retention worker (retention: {self.retention_days} days)")
        
        while self.running:
            try:
                self._process_retention()
                time.sleep(self.check_interval_seconds)
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Error in retention worker: {e}", exc_info=True)
                time.sleep(60)  # Backoff on error
        
        logger.info("Retention worker stopped")
    
    def stop(self) -> None:
        """Stop retention worker"""
        self.running = False
    
    def _process_retention(self) -> None:
        """Process retention: find and delete expired snapshots"""
        try:
            # Get expired snapshots
            expired_snapshots = self.repository.get_expired_snapshots(self.retention_days)
            
            if not expired_snapshots:
                logger.debug(f"No expired snapshots found (retention: {self.retention_days} days)")
                return
            
            logger.info(
                f"Found {len(expired_snapshots)} expired snapshots to delete",
                extra={
                    'count': len(expired_snapshots),
                    'retention_days': self.retention_days,
                }
            )
            
            deleted_count = 0
            error_count = 0
            
            for snapshot in expired_snapshots:
                try:
                    # Delete from S3
                    s3_success = self.s3_storage.delete_file(snapshot.s3_key)
                    
                    if s3_success:
                        # Delete metadata from database
                        db_success = self.repository.delete_snapshot_metadata(snapshot.snapshot_id)
                        
                        if db_success:
                            deleted_count += 1
                            logger.debug(
                                f"Deleted expired snapshot",
                                extra={
                                    'snapshot_id': snapshot.snapshot_id,
                                    'violation_id': snapshot.violation_id,
                                    's3_key': snapshot.s3_key,
                                }
                            )
                        else:
                            error_count += 1
                            logger.warning(
                                f"Failed to delete snapshot metadata (S3 already deleted)",
                                extra={
                                    'snapshot_id': snapshot.snapshot_id,
                                }
                            )
                    else:
                        error_count += 1
                        logger.warning(
                            f"Failed to delete snapshot from S3",
                            extra={
                                'snapshot_id': snapshot.snapshot_id,
                                's3_key': snapshot.s3_key,
                            }
                        )
                        
                except Exception as e:
                    error_count += 1
                    logger.error(
                        f"Error deleting expired snapshot: {e}",
                        extra={
                            'snapshot_id': snapshot.snapshot_id,
                        },
                        exc_info=True
                    )
            
            logger.info(
                f"Retention processing completed",
                extra={
                    'total': len(expired_snapshots),
                    'deleted': deleted_count,
                    'errors': error_count,
                }
            )
            
        except Exception as e:
            logger.error(f"Error in retention processing: {e}", exc_info=True)

