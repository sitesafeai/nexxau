"""
Tests for Acknowledgement Repository

Tests acknowledgement persistence and queries.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from acknowledgement_repository import AcknowledgementRepository, Acknowledgement


@pytest.fixture
def mock_db_pool():
    """Mock database connection pool"""
    pool = Mock()
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    pool.getconn.return_value = conn
    pool.putconn = Mock()
    return pool, conn, cursor


def test_create_acknowledgement_success(mock_db_pool):
    """Test successful acknowledgement creation"""
    pool, conn, cursor = mock_db_pool
    cursor.execute = Mock()
    cursor.close = Mock()
    
    repo = AcknowledgementRepository(pool)
    
    ack_id = repo.create_acknowledgement(
        tenant_id="tenant-123",
        violation_id="violation-456",
        user_id="user-789",
        note="Acknowledged"
    )
    
    assert ack_id is not None
    cursor.execute.assert_called_once()
    conn.commit.assert_called_once()


def test_create_acknowledgement_duplicate(mock_db_pool):
    """Test acknowledgement creation with duplicate (integrity error)"""
    import psycopg2
    pool, conn, cursor = mock_db_pool
    cursor.execute = Mock(side_effect=psycopg2.IntegrityError("duplicate"))
    cursor.close = Mock()
    
    repo = AcknowledgementRepository(pool)
    
    ack_id = repo.create_acknowledgement(
        tenant_id="tenant-123",
        violation_id="violation-456",
        user_id="user-789"
    )
    
    assert ack_id is None
    conn.rollback.assert_called_once()


def test_get_acknowledgement_exists(mock_db_pool):
    """Test getting existing acknowledgement"""
    pool, conn, cursor = mock_db_pool
    
    mock_row = {
        'id': 'ack-123',
        'tenant_id': 'tenant-456',
        'violation_id': 'violation-789',
        'user_id': 'user-001',
        'acknowledged_at': datetime.utcnow(),
        'note': 'Test note',
        'created_at': datetime.utcnow()
    }
    
    cursor.fetchone.return_value = mock_row
    cursor.close = Mock()
    
    repo = AcknowledgementRepository(pool)
    ack = repo.get_acknowledgement("violation-789", "user-001")
    
    assert ack is not None
    assert ack.violation_id == "violation-789"
    assert ack.user_id == "user-001"
    assert ack.note == "Test note"


def test_get_acknowledgement_not_exists(mock_db_pool):
    """Test getting non-existent acknowledgement"""
    pool, conn, cursor = mock_db_pool
    cursor.fetchone.return_value = None
    cursor.close = Mock()
    
    repo = AcknowledgementRepository(pool)
    ack = repo.get_acknowledgement("violation-789", "user-001")
    
    assert ack is None


def test_has_acknowledgement_true(mock_db_pool):
    """Test has_acknowledgement returns True when acknowledgement exists"""
    pool, conn, cursor = mock_db_pool
    cursor.fetchone.return_value = (1,)  # Row exists
    cursor.close = Mock()
    
    repo = AcknowledgementRepository(pool)
    has_ack = repo.has_acknowledgement("violation-789")
    
    assert has_ack is True


def test_has_acknowledgement_false(mock_db_pool):
    """Test has_acknowledgement returns False when no acknowledgement"""
    pool, conn, cursor = mock_db_pool
    cursor.fetchone.return_value = None
    cursor.close = Mock()
    
    repo = AcknowledgementRepository(pool)
    has_ack = repo.has_acknowledgement("violation-789")
    
    assert has_ack is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

