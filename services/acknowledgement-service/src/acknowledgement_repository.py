"""
Acknowledgement Repository

PostgreSQL persistence for acknowledgements with method tracking.
"""
import logging
from typing import Optional, List
from datetime import datetime
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from .acknowledgement_model import Acknowledgement, AcknowledgementMethod

logger = logging.getLogger(__name__)


class AcknowledgementRepository:
    """
    Repository for acknowledgement persistence.
    
    Extends existing acknowledgements table to track method.
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
        violation_id: str,
        tenant_id: str,
        user_id: str,
        method: AcknowledgementMethod,
        note: Optional[str] = None,
        acknowledged_at: Optional[datetime] = None
    ) -> Optional[str]:
        """
        Create acknowledgement record.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            user_id: User identifier
            method: Acknowledgement method (web, email_link, sms)
            note: Optional acknowledgement note
            acknowledged_at: Acknowledgement timestamp (default: now)
            
        Returns:
            Acknowledgement ID if successful, None otherwise
        """
        import uuid
        ack_id = str(uuid.uuid4())
        acknowledged_at = acknowledged_at or datetime.utcnow()
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                try:
                    # Store method in note field metadata (or extend schema if method column exists)
                    # For now, prepend method to note for tracking
                    note_with_method = note or ""
                    if note_with_method:
                        note_with_method = f"[{method.value}] {note_with_method}"
                    else:
                        note_with_method = f"[{method.value}]"
                    
                    cursor.execute("""
                        INSERT INTO acknowledgements (
                            id, tenant_id, violation_id, user_id, 
                            acknowledged_at, note, created_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, NOW()
                        )
                    """, (ack_id, tenant_id, violation_id, user_id, acknowledged_at, note_with_method))
                    
                    logger.info(
                        f"Created acknowledgement",
                        extra={
                            'acknowledgement_id': ack_id,
                            'violation_id': violation_id,
                            'user_id': user_id,
                            'method': method.value,
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
    
    def get_acknowledgement_by_violation(
        self,
        violation_id: str
    ) -> Optional[Acknowledgement]:
        """Get acknowledgement for violation (first one)"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM acknowledgements
                        WHERE violation_id = %s
                        ORDER BY acknowledged_at ASC
                        LIMIT 1
                    """, (violation_id,))
                    
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
        """Check if violation has any acknowledgements"""
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
    
    def _parse_method_from_note(self, note: Optional[str]) -> AcknowledgementMethod:
        """Parse acknowledgement method from note field"""
        if not note:
            return AcknowledgementMethod.WEB  # Default
        
        # Extract method from note format: [method] rest of note
        if note.startswith('[email_link]'):
            return AcknowledgementMethod.EMAIL_LINK
        elif note.startswith('[sms]'):
            return AcknowledgementMethod.SMS
        elif note.startswith('[web]'):
            return AcknowledgementMethod.WEB
        else:
            return AcknowledgementMethod.WEB  # Default
    
    def _row_to_acknowledgement(self, row: dict) -> Acknowledgement:
        """Convert database row to Acknowledgement"""
        note = row.get('note')
        method = self._parse_method_from_note(note)
        
        # Extract clean note (remove method prefix)
        clean_note = note
        if note and note.startswith('['):
            # Remove method prefix
            parts = note.split(']', 1)
            if len(parts) > 1:
                clean_note = parts[1].strip()
            else:
                clean_note = None
        
        return Acknowledgement(
            id=str(row['id']),
            violation_id=str(row['violation_id']),
            tenant_id=str(row['tenant_id']),
            user_id=str(row['user_id']),
            acknowledged_at=row['acknowledged_at'],
            method=method,
            note=clean_note,
            created_at=row['created_at']
        )

