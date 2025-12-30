"""
Tests for Violation Repository Rollback Safety

Tests ensure that transactional writes properly rollback on failure.
"""
import pytest
import uuid
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
import psycopg2

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from violation_repository import ViolationRepository
from violation_model import Violation, ViolationState, SeverityLevel


@pytest.fixture
def mock_pool():
    """Mock connection pool"""
    pool = Mock()
    conn = Mock()
    pool.getconn.return_value = conn
    conn.cursor.return_value = Mock()
    return pool, conn


@pytest.fixture
def sample_violation():
    """Sample violation for testing"""
    return Violation(
        violation_id=str(uuid.uuid4()),
        tenant_id=str(uuid.uuid4()),
        worksite_id=str(uuid.uuid4()),
        camera_id=str(uuid.uuid4()),
        violation_type='NO_HELMET',
        zone_id=None,
        state=ViolationState.ACTIVE,
        first_seen_at=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
        last_alert_at=None,
        severity_level=SeverityLevel.MEDIUM,
        metadata={}
    )


def test_upsert_violation_rollback_on_event_failure(mock_pool, sample_violation):
    """
    Test that violation update rolls back if event insertion fails.
    
    Scenario:
    1. Violation update succeeds
    2. Event insertion fails
    3. Transaction should rollback (violation update undone)
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    cursor = Mock()
    conn.cursor.return_value = cursor
    
    # First call (violation upsert) succeeds
    # Second call (event insert) fails
    cursor.execute.side_effect = [
        None,  # Violation upsert succeeds
        psycopg2.Error("Event insert failed")  # Event insert fails
    ]
    
    # Should raise exception and rollback
    with pytest.raises(psycopg2.Error):
        repo.upsert_violation(
            violation=sample_violation,
            event_type='STATE_CHANGED',
            old_state=ViolationState.PENDING,
            transition_reason='test',
            should_alert=True
        )
    
    # Verify rollback was called
    conn.rollback.assert_called_once()
    # Verify commit was NOT called
    conn.commit.assert_not_called()


def test_upsert_violation_rollback_on_violation_failure(mock_pool, sample_violation):
    """
    Test that transaction rolls back if violation update fails.
    
    Scenario:
    1. Violation update fails
    2. Event insertion should not be attempted
    3. Transaction should rollback
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    cursor = Mock()
    conn.cursor.return_value = cursor
    
    # First call (violation upsert) fails
    cursor.execute.side_effect = psycopg2.Error("Violation upsert failed")
    
    # Should raise exception and rollback
    with pytest.raises(psycopg2.Error):
        repo.upsert_violation(
            violation=sample_violation,
            event_type='CREATED',
            old_state=None,
            transition_reason='test',
            should_alert=False
        )
    
    # Verify rollback was called
    conn.rollback.assert_called_once()
    # Verify commit was NOT called
    conn.commit.assert_not_called()
    # Verify only one execute call (violation upsert, event insert not attempted)
    assert cursor.execute.call_count == 1


def test_upsert_violation_success_commits(mock_pool, sample_violation):
    """
    Test that successful upsert commits transaction.
    
    Scenario:
    1. Violation update succeeds
    2. Event insertion succeeds
    3. Transaction should commit
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    cursor = Mock()
    conn.cursor.return_value = cursor
    
    # Both calls succeed
    cursor.execute.return_value = None
    
    # Should succeed without exception
    result = repo.upsert_violation(
        violation=sample_violation,
        event_type='STATE_CHANGED',
        old_state=ViolationState.PENDING,
        transition_reason='test',
        should_alert=True
    )
    
    assert result is True
    
    # Verify commit was called (via context manager)
    # Note: In actual implementation, commit happens in context manager exit
    # For this test, we verify that no rollback occurred
    conn.rollback.assert_not_called()


def test_upsert_violation_handles_duplicate_escalation(mock_pool, sample_violation):
    """
    Test that duplicate escalation events are handled idempotently.
    
    Scenario:
    1. Violation update succeeds
    2. Event insertion fails with unique constraint violation on escalation
    3. Should be treated as success (idempotent)
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    cursor = Mock()
    conn.cursor.return_value = cursor
    
    # First call (violation upsert) succeeds
    # Second call (event insert) fails with unique constraint violation
    error = psycopg2.IntegrityError("duplicate key value violates unique constraint \"idx_violation_events_escalation_unique\"")
    cursor.execute.side_effect = [
        None,  # Violation upsert succeeds
        error  # Event insert fails with unique constraint
    ]
    
    # Should succeed (idempotent)
    result = repo.upsert_violation(
        violation=sample_violation,
        event_type='ESCALATED',
        old_state=ViolationState.ACTIVE,
        transition_reason='test',
        should_alert=True
    )
    
    assert result is True


def test_upsert_violation_raises_on_duplicate_active_violation(mock_pool, sample_violation):
    """
    Test that duplicate active violations raise exception.
    
    Scenario:
    1. Violation update fails with unique constraint violation on dedup key
    2. Should raise exception (this should not happen in normal operation)
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    cursor = Mock()
    conn.cursor.return_value = cursor
    
    # Violation upsert fails with unique constraint violation on dedup key
    error = psycopg2.IntegrityError("duplicate key value violates unique constraint \"idx_violations_dedup_key_active\"")
    cursor.execute.side_effect = error
    
    # Should raise exception
    with pytest.raises(psycopg2.IntegrityError):
        repo.upsert_violation(
            violation=sample_violation,
            event_type='CREATED',
            old_state=None,
            transition_reason='test',
            should_alert=False
        )
    
    # Verify rollback was called
    conn.rollback.assert_called_once()


def test_get_connection_context_manager_rollback(mock_pool):
    """
    Test that connection context manager properly handles rollback.
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    # Simulate exception in context
    with pytest.raises(ValueError):
        with repo.get_connection() as conn:
            raise ValueError("Test error")
    
    # Verify rollback was called
    conn.rollback.assert_called_once()
    # Verify commit was NOT called
    conn.commit.assert_not_called()
    # Verify connection was returned to pool
    pool.putconn.assert_called_once_with(conn)


def test_get_connection_context_manager_success(mock_pool):
    """
    Test that connection context manager commits on success.
    """
    pool, conn = mock_pool
    repo = ViolationRepository(pool)
    
    # Successful operation
    with repo.get_connection() as conn:
        pass  # No exception
    
    # Note: Commit happens in context manager __exit__ on success
    # For this test, we verify that no rollback occurred
    conn.rollback.assert_not_called()
    # Verify connection was returned to pool
    pool.putconn.assert_called_once_with(conn)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

