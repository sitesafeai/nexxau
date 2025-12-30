"""
Snapshot Client

Fetches snapshot URLs from snapshot service or database.
"""
import logging
from typing import Optional, Dict, Any
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class SnapshotClient:
    """
    Client for fetching snapshot URLs.
    
    Fetches snapshot metadata from PostgreSQL to get S3 URLs,
    then generates signed URLs if needed.
    """
    
    def __init__(self, db_pool, s3_client=None):
        """
        Initialize snapshot client.
        
        Args:
            db_pool: PostgreSQL connection pool
            s3_client: Optional S3 client for generating signed URLs
        """
        self.db_pool = db_pool
        self.s3_client = s3_client
    
    def get_snapshot_urls(
        self,
        violation_id: str,
        signed_url_ttl_seconds: int = 3600
    ) -> Dict[str, Optional[str]]:
        """
        Get snapshot and clip URLs for a violation.
        
        Args:
            violation_id: Violation identifier
            signed_url_ttl_seconds: TTL for signed URLs (if using S3 client)
            
        Returns:
            Dict with 'snapshot_url' and 'clip_url' keys
        """
        result = {
            'snapshot_url': None,
            'clip_url': None
        }
        
        try:
            conn = self.db_pool.getconn()
            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    # Query snapshot metadata
                    cursor.execute("""
                        SELECT snapshot_type, s3_key, s3_bucket
                        FROM violation_snapshots
                        WHERE violation_id = %s
                        ORDER BY 
                            CASE snapshot_type 
                                WHEN 'snapshot' THEN 1 
                                WHEN 'clip' THEN 2 
                            END,
                            captured_at DESC
                    """, (violation_id,))
                    
                    rows = cursor.fetchall()
                    
                    for row in rows:
                        s3_key = row['s3_key']
                        s3_bucket = row['s3_bucket']
                        snapshot_type = row['snapshot_type']
                        
                        # Generate signed URL if S3 client is available
                        if self.s3_client:
                            try:
                                signed_url = self.s3_client.generate_presigned_url(
                                    'get_object',
                                    Params={
                                        'Bucket': s3_bucket,
                                        'Key': s3_key
                                    },
                                    ExpiresIn=signed_url_ttl_seconds
                                )
                                
                                if snapshot_type == 'snapshot':
                                    result['snapshot_url'] = signed_url
                                elif snapshot_type == 'clip':
                                    result['clip_url'] = signed_url
                                    
                            except Exception as e:
                                logger.warning(
                                    f"Failed to generate signed URL for {s3_key}: {e}",
                                    extra={'violation_id': violation_id}
                                )
                        else:
                            # Return S3 key as placeholder if no S3 client
                            # In production, would construct proper S3 URL or use CloudFront
                            s3_url = f"s3://{s3_bucket}/{s3_key}"
                            if snapshot_type == 'snapshot':
                                result['snapshot_url'] = s3_url
                            elif snapshot_type == 'clip':
                                result['clip_url'] = s3_url
                    
                finally:
                    cursor.close()
            finally:
                self.db_pool.putconn(conn)
                
        except Exception as e:
            logger.error(
                f"Failed to fetch snapshot URLs: {e}",
                extra={'violation_id': violation_id},
                exc_info=True
            )
        
        return result

