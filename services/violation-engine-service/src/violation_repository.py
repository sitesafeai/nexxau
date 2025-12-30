"""
Violation Repository

PostgreSQL persistence layer for violations.
Handles transactional writes to violations and violation_events tables.
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
import json

from .violation_model import Violation, ViolationState, SeverityLevel

logger = logging.getLogger(__name__)


class ViolationRepository:
    """
    Repository for violation persistence.
    
    Handles transactional writes to violations and violation_events tables.
    Ensures data consistency and idempotency.
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
        """
        Get connection from pool with automatic return.
        
        Commits on success, rolls back on exception.
        """
        conn = self.pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.pool.putconn(conn)
    
    def upsert_violation(
        self,
        violation: Violation,
        event_type: str,
        old_state: Optional[ViolationState],
        transition_reason: str,
        should_alert: bool,
        event_payload: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Upsert violation and append event log entry atomically.
        
        This is the main write method - ensures both violation update
        and event log entry are written in a single transaction.
        
        Transaction Safety:
        - If violation upsert fails -> rollback (no event written)
        - If event insert fails -> rollback (violation update undone)
        - Both must succeed or both are rolled back
        
        Args:
            violation: Violation instance to persist
            event_type: Event type (CREATED, STATE_CHANGED, ESCALATED, RESOLVED)
            old_state: Previous state (for state change events)
            transition_reason: Reason for state transition
            should_alert: Whether alert should be sent
            event_payload: Optional additional event data
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            Exception on database errors (transaction will be rolled back)
        """
        try:
            with self.get_connection() as conn:
                # Upsert violation
                self._upsert_violation_row(conn, violation)
                
                # Insert event log entry
                self._insert_event(conn, violation.violation_id, event_type, old_state, 
                                 violation.state, transition_reason, should_alert, event_payload)
                
                # Transaction commits automatically on context exit (no exception)
                return True
                
        except psycopg2.IntegrityError as e:
            # Handle unique constraint violations (idempotency)
            error_str = str(e)
            if 'idx_violation_events_escalation_unique' in error_str:
                logger.warning(
                    f"Duplicate escalation event for violation {violation.violation_id} (idempotent, ignoring)"
                )
                return True  # Idempotent: duplicate escalation is OK
            elif 'idx_violations_dedup_key_active' in error_str:
                logger.error(
                    f"Duplicate active violation for dedup key {violation.get_dedup_key()}"
                )
                raise  # This should not happen in normal operation
            else:
                logger.error(f"Integrity error upserting violation: {e}", exc_info=True)
                raise
        except Exception as e:
            logger.error(f"Error upserting violation: {e}", exc_info=True)
            raise
    
    def _upsert_violation_row(self, conn, violation: Violation) -> None:
        """
        Upsert violation row.
        
        Uses INSERT ... ON CONFLICT to handle both inserts and updates.
        The unique index idx_violations_dedup_key_active prevents duplicate active violations.
        """
        cursor = conn.cursor()
        
        try:
            # Use primary key conflict resolution
            # The unique index will enforce dedup key uniqueness at database level
            insert_sql = """
                INSERT INTO violations (
                    violation_id, tenant_id, worksite_id, camera_id, violation_type,
                    zone_id, state, first_seen_at, last_seen_at, last_alert_at,
                    severity_level, metadata, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                )
                ON CONFLICT (violation_id)
                DO UPDATE SET
                    state = EXCLUDED.state,
                    last_seen_at = EXCLUDED.last_seen_at,
                    last_alert_at = EXCLUDED.last_alert_at,
                    severity_level = EXCLUDED.severity_level,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
            """
            
            cursor.execute(insert_sql, (
                violation.violation_id,
                violation.tenant_id,
                violation.worksite_id,
                violation.camera_id,
                violation.violation_type,
                violation.zone_id,
                violation.state.value,
                violation.first_seen_at,
                violation.last_seen_at,
                violation.last_alert_at,
                violation.severity_level.value,
                json.dumps(violation.metadata)
            ))
                
        finally:
            cursor.close()
    
    def _insert_event(
        self,
        conn,
        violation_id: str,
        event_type: str,
        old_state: Optional[ViolationState],
        new_state: ViolationState,
        transition_reason: str,
        should_alert: bool,
        payload: Optional[Dict[str, Any]]
    ) -> None:
        """
        Insert event log entry.
        
        Uses ON CONFLICT for idempotency on escalation events.
        """
        cursor = conn.cursor()
        
        try:
            # Handle idempotency for escalation events
            if event_type == 'ESCALATED':
                insert_sql = """
                    INSERT INTO violation_events (
                        violation_id, event_type, old_state, new_state,
                        transition_reason, should_alert, timestamp, payload, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, NOW(), %s, NOW()
                    )
                    ON CONFLICT (violation_id, event_type) WHERE event_type = 'ESCALATED'
                    DO NOTHING
                """
            else:
                insert_sql = """
                    INSERT INTO violation_events (
                        violation_id, event_type, old_state, new_state,
                        transition_reason, should_alert, timestamp, payload, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, NOW(), %s, NOW()
                    )
                """
            
            cursor.execute(insert_sql, (
                violation_id,
                event_type,
                old_state.value if old_state else None,
                new_state.value,
                transition_reason,
                should_alert,
                json.dumps(payload or {})
            ))
            
        finally:
            cursor.close()
    
    def get_violation_by_id(self, violation_id: str) -> Optional[Violation]:
        """Get violation by violation_id"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM violations
                        WHERE violation_id = %s
                    """, (violation_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return self._row_to_violation(row)
                    return None
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting violation {violation_id}: {e}", exc_info=True)
            return None
    
    def get_violation_by_dedup_key(
        self,
        camera_id: str,
        violation_type: str,
        zone_id: Optional[str]
    ) -> Optional[Violation]:
        """Get active violation by dedup key"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM violations
                        WHERE camera_id = %s
                          AND violation_type = %s
                          AND COALESCE(zone_id::text, 'none') = COALESCE(%s::text, 'none')
                          AND state IN ('PENDING', 'ACTIVE', 'ESCALATED')
                        LIMIT 1
                    """, (camera_id, violation_type, zone_id))
                    
                    row = cursor.fetchone()
                    if row:
                        return self._row_to_violation(row)
                    return None
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting violation by dedup key: {e}", exc_info=True)
            return None
    
    def get_active_violations(self, limit: int = 1000) -> List[Violation]:
        """Get all active violations"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM violations
                        WHERE state IN ('ACTIVE', 'ESCALATED')
                        ORDER BY last_seen_at DESC
                        LIMIT %s
                    """, (limit,))
                    
                    rows = cursor.fetchall()
                    return [self._row_to_violation(row) for row in rows]
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting active violations: {e}", exc_info=True)
            return []
    
    def get_violations_for_resolution_check(
        self,
        resolution_seconds: int
    ) -> List[Violation]:
        """
        Get violations that may need resolution (no detection for resolution_seconds).
        
        Args:
            resolution_seconds: Seconds without detection before resolution
            
        Returns:
            List of violations that may need resolution
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                try:
                    cursor.execute("""
                        SELECT * FROM violations
                        WHERE state IN ('ACTIVE', 'ESCALATED')
                          AND last_seen_at < NOW() - INTERVAL '%s seconds'
                        ORDER BY last_seen_at ASC
                    """, (resolution_seconds,))
                    
                    rows = cursor.fetchall()
                    return [self._row_to_violation(row) for row in rows]
                finally:
                    cursor.close()
        except Exception as e:
            logger.error(f"Error getting violations for resolution check: {e}", exc_info=True)
            return []
    
    def _row_to_violation(self, row: Dict) -> Violation:
        """Convert database row to Violation object"""
        return Violation(
            violation_id=str(row['violation_id']),
            tenant_id=str(row['tenant_id']),
            worksite_id=str(row['worksite_id']),
            camera_id=str(row['camera_id']),
            violation_type=row['violation_type'],
            zone_id=str(row['zone_id']) if row['zone_id'] else None,
            state=ViolationState(row['state']),
            first_seen_at=row['first_seen_at'],
            last_seen_at=row['last_seen_at'],
            last_alert_at=row['last_alert_at'],
            severity_level=SeverityLevel(row['severity_level']),
            metadata=row['metadata'] if isinstance(row['metadata'], dict) else json.loads(row['metadata'])
        )
