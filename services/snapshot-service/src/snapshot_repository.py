"""
Snapshot Repository

PostgreSQL persistence for snapshot metadata.
"""
import logging
from typing import Optional, List
from datetime import datetime
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
import json

logger = logging.getLogger(__name__)


class SnapshotMetadata:
    """Snapshot metadata model"""
    def __init__(
        self,
        snapshot_id: str,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        snapshot_type: str,  # 'snapshot' or 'clip'
        s3_key: str,
        s3_bucket: str,
        file_size_bytes: int,
        content_type: str,
        captured_at: datetime,
        violation_timestamp: datetime,
        created_at: datetime
    ):
        self.snapshot_id = snapshot_id
        self.violation_id = violation_id
        self.tenant_id = tenant_id
        self.worksite_id = worksite_id
        self.camera_id = camera_id
        self.snapshot_type = snapshot_type
        self.s3_key = s3_key
        self.s3_bucket = s3_bucket
        self.file_size_bytes = file_size_bytes
        self.content_type = content_type
        self.captured_at = captured_at
        self.violation_timestamp = violation_timestamp
        self.created_at = created_at


class SnapshotRepository:
    """
    Repository for snapshot metadata persistence.
    """
    
    def __init__(self, connection_pool: ThreadedConnectionPool):
        """
        Initialize repository.
        
        Args:
            connection_pool: PostgreSQL connection pool
        """
        self.pool = connection_pool
    
    @contextmanager
    def get_connection(self):
        """Get connection from pool with automatic return"""
        conn = self.pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.pool.putconn(conn)
    
    def create_snapshot_metadata(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        snapshot_type: str,
        s3_key: str,
        s3_bucket: str,
        file_size_bytes: int,
        content_type: str,
        violation_timestamp: datetime
    ) -> Optional[str]:
        """
        Create snapshot metadata record.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            worksite_id: Worksite identifier
            camera_id: Camera identifier
            snapshot_type: 'snapshot' or 'clip'
            s3_key: S3 object key
            s3_bucket: S3 bucket name
            file_size_bytes: File size in bytes
            content_type: Content type (e.g., 'image/jpeg', 'video/mp4')
            violation_timestamp: Timestamp of violation
            
        Returns:
            Snapshot ID (UUID) if successful, None otherwise
        """
        import uuid
        snapshot_id = str(uuid.uuid4())
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute("""
                        INSERT INTO violation_snapshots (
                            snapshot_id, violation_id, tenant_id, worksite_id, camera_id,
                            snapshot_type, s3_key, s3_bucket, file_size_bytes, content_type,
                            captured_at, violation_timestamp, created_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, NOW()
                        )
                    """, (
                        snapshot_id,
                        violation_id,
                        tenant_id,
                        worksite_id,
                        camera_id,
                        snapshot_type,
                        s3_key,
                        s3_bucket,
                        file_size_bytes,
                        content_type,
                        violation_timestamp
                    ))
                    
                    logger.info(
                        f"Created snapshot metadata",
                        extra={
                            'snapshot_id': snapshot_id,
                            'violation_id': violation_id,
                            'snapshot_type': snapshot_type,
                        }
                    )
                    
                    return snapshot_id
                    
                finally:
                    cursor.close()
                    
        except Exception as e:
            logger.error(f"Error creating snapshot metadata: {e}", exc_info=True)
            return None
    
    def get_snapshots_by_violation(self, violation_id: str) -> List[SnapshotMetadata]:
        """Get all snapshots for a violation"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM violation_snapshots
                        WHERE violation_id = %s
                        ORDER BY captured_at DESC
                    """, (violation_id,))
                    
                    rows = cursor.fetchall()
                    return [self._row_to_snapshot(row) for row in rows]
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting snapshots: {e}", exc_info=True)
            return []
    
    def get_expired_snapshots(self, retention_days: int = 30) -> List[SnapshotMetadata]:
        """
        Get snapshots that have exceeded retention period.
        
        Args:
            retention_days: Retention period in days (default: 30)
            
        Returns:
            List of expired snapshots
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM violation_snapshots
                        WHERE captured_at < NOW() - INTERVAL '%s days'
                        ORDER BY captured_at ASC
                    """, (retention_days,))
                    
                    rows = cursor.fetchall()
                    return [self._row_to_snapshot(row) for row in rows]
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting expired snapshots: {e}", exc_info=True)
            return []
    
    def delete_snapshot_metadata(self, snapshot_id: str) -> bool:
        """Delete snapshot metadata record"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute("""
                        DELETE FROM violation_snapshots
                        WHERE snapshot_id = %s
                    """, (snapshot_id,))
                    
                    return cursor.rowcount > 0
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error deleting snapshot metadata: {e}", exc_info=True)
            return False
    
    def _row_to_snapshot(self, row: dict) -> SnapshotMetadata:
        """Convert database row to SnapshotMetadata"""
        return SnapshotMetadata(
            snapshot_id=str(row['snapshot_id']),
            violation_id=str(row['violation_id']),
            tenant_id=str(row['tenant_id']),
            worksite_id=str(row['worksite_id']),
            camera_id=str(row['camera_id']),
            snapshot_type=row['snapshot_type'],
            s3_key=row['s3_key'],
            s3_bucket=row['s3_bucket'],
            file_size_bytes=row['file_size_bytes'],
            content_type=row['content_type'],
            captured_at=row['captured_at'],
            violation_timestamp=row['violation_timestamp'],
            created_at=row['created_at']
        )

