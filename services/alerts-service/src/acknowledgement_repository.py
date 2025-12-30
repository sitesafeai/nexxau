"""
Acknowledgement Repository

PostgreSQL persistence for violation acknowledgements.
"""
import logging
from typing import Optional, List
from datetime import datetime
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

logger = logging.getLogger(__name__)


class Acknowledgement:
    """Acknowledgement model"""
    def __init__(
        self,
        id: str,
        tenant_id: str,
        violation_id: str,
        user_id: str,
        acknowledged_at: datetime,
        note: Optional[str],
        created_at: datetime
    ):
        self.id = id
        self.tenant_id = tenant_id
        self.violation_id = violation_id
        self.user_id = user_id
        self.acknowledged_at = acknowledged_at
        self.note = note
        self.created_at = created_at


class AcknowledgementRepository:
    """
    Repository for acknowledgement persistence.
    
    Uses existing 'acknowledgements' table from schema.
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
    
    def create_acknowledgement(
        self,
        tenant_id: str,
        violation_id: str,
        user_id: str,
        note: Optional[str] = None
    ) -> Optional[str]:
        """
        Create acknowledgement record.
        
        Args:
            tenant_id: Tenant identifier
            violation_id: Violation identifier
            user_id: User identifier
            note: Optional acknowledgement note
            
        Returns:
            Acknowledgement ID if successful, None otherwise
        """
        import uuid
        ack_id = str(uuid.uuid4())
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute("""
                        INSERT INTO acknowledgements (
                            id, tenant_id, violation_id, user_id, acknowledged_at, note, created_at
                        ) VALUES (
                            %s, %s, %s, %s, NOW(), %s, NOW()
                        )
                    """, (ack_id, tenant_id, violation_id, user_id, note))
                    
                    logger.info(
                        f"Created acknowledgement",
                        extra={
                            'acknowledgement_id': ack_id,
                            'violation_id': violation_id,
                            'user_id': user_id,
                        }
                    )
                    
                    return ack_id
                    
                finally:
                    cursor.close()
                    
        except psycopg2.IntegrityError as e:
            # Unique constraint violation (user already acknowledged this violation)
            logger.warning(
                f"Acknowledgement already exists",
                extra={
                    'violation_id': violation_id,
                    'user_id': user_id,
                }
            )
            return None
        except Exception as e:
            logger.error(f"Error creating acknowledgement: {e}", exc_info=True)
            return None
    
    def get_acknowledgement(
        self,
        violation_id: str,
        user_id: str
    ) -> Optional[Acknowledgement]:
        """Get acknowledgement for violation by user"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM acknowledgements
                        WHERE violation_id = %s AND user_id = %s
                        LIMIT 1
                    """, (violation_id, user_id))
                    
                    row = cursor.fetchone()
                    if row:
                        return self._row_to_acknowledgement(row)
                    return None
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting acknowledgement: {e}", exc_info=True)
            return None
    
    def get_acknowledgements_by_violation(
        self,
        violation_id: str
    ) -> List[Acknowledgement]:
        """Get all acknowledgements for a violation"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM acknowledgements
                        WHERE violation_id = %s
                        ORDER BY acknowledged_at DESC
                    """, (violation_id,))
                    
                    rows = cursor.fetchall()
                    return [self._row_to_acknowledgement(row) for row in rows]
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting acknowledgements: {e}", exc_info=True)
            return []
    
    def has_acknowledgement(self, violation_id: str) -> bool:
        """
        Check if violation has any acknowledgements.
        
        Used for suppression logic (if acknowledged, suppress alerts).
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute("""
                        SELECT 1 FROM acknowledgements
                        WHERE violation_id = %s
                        LIMIT 1
                    """, (violation_id,))
                    
                    return cursor.fetchone() is not None
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error checking acknowledgement: {e}", exc_info=True)
            return False
    
    def _row_to_acknowledgement(self, row: dict) -> Acknowledgement:
        """Convert database row to Acknowledgement"""
        return Acknowledgement(
            id=str(row['id']),
            tenant_id=str(row['tenant_id']),
            violation_id=str(row['violation_id']),
            user_id=str(row['user_id']),
            acknowledged_at=row['acknowledged_at'],
            note=row.get('note'),
            created_at=row['created_at']
        )

