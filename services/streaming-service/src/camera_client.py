"""
Camera Client

Fetches camera information from database for streaming.
"""
import logging
from typing import Optional, Dict
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class CameraClient:
    """
    Client for fetching camera information from database.
    """
    
    def __init__(self, db_pool):
        """
        Initialize camera client.
        
        Args:
            db_pool: PostgreSQL connection pool
        """
        self.db_pool = db_pool
    
    def get_camera(self, camera_id: str) -> Optional[Dict]:
        """
        Get camera information.
        
        Args:
            camera_id: Camera identifier
            
        Returns:
            Dict with camera info (id, stream_url, worksite_id, etc.) or None
        """
        try:
            conn = self.db_pool.getconn()
            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT id, stream_url, worksite_id, tenant_id, name
                        FROM cameras
                        WHERE id = %s AND is_active = true
                    """, (camera_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return dict(row)
                    return None
                finally:
                    cursor.close()
            finally:
                self.db_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error fetching camera: {e}", exc_info=True)
            return None
    
    def get_camera_count_by_worksite(self, worksite_id: str) -> int:
        """
        Get camera count for worksite (for protocol selection).
        
        Args:
            worksite_id: Worksite identifier
            
        Returns:
            Number of active cameras at worksite
        """
        try:
            conn = self.db_pool.getconn()
            try:
                cursor = conn.cursor()
                try:
                    cursor.execute("""
                        SELECT COUNT(*) as count
                        FROM cameras
                        WHERE worksite_id = %s AND is_active = true
                    """, (worksite_id,))
                    
                    row = cursor.fetchone()
                    return row[0] if row else 0
                finally:
                    cursor.close()
            finally:
                self.db_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error fetching camera count: {e}", exc_info=True)
            return 0

