"""
Tests for Alert Processor

Tests alert processing logic including suppression, snapshot fetching, and retries.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from alert_processor import AlertProcessor
from violation_consumer import ViolationStateChange
from alert_router import AlertRouter
from snapshot_client import SnapshotClient
from acknowledgement_repository import AcknowledgementRepository


class MockAlertChannel:
    """Mock alert channel"""
    def __init__(self, name):
        self.name = name
        self.send_calls = []
        self.should_succeed = True
    
    def get_channel_name(self):
        return self.name
    
    def send_alert(self, **kwargs):
        self.send_calls.append(kwargs)
        return self.should_succeed


def test_process_violation_state_change_success():
    """Test successful alert processing"""
    # Setup mocks
    router = Mock(spec=AlertRouter)
    router.send_alert = Mock(return_value={'websocket': True})
    
    snapshot_client = Mock(spec=SnapshotClient)
    snapshot_client.get_snapshot_urls = Mock(return_value={
        'snapshot_url': 'https://example.com/snapshot.jpg',
        'clip_url': None
    })
    
    ack_repo = Mock(spec=AcknowledgementRepository)
    ack_repo.has_acknowledgement = Mock(return_value=False)
    
    processor = AlertProcessor(
        alert_router=router,
        snapshot_client=snapshot_client,
        acknowledgement_repository=ack_repo,
        require_snapshots=True
    )
    
    # Create state change
    state_change = ViolationStateChange(
        message_id="msg-123",
        violation_id="violation-456",
        tenant_id="tenant-789",
        worksite_id="worksite-001",
        camera_id="camera-002",
        violation_type="NO_HELMET",
        old_state="PENDING",
        new_state="ACTIVE",
        transition_reason="threshold_met",
        should_alert=True,
        timestamp=datetime.utcnow().isoformat() + 'Z',
        metadata={},
        raw_message={}
    )
    
    # Process
    result = processor.process_violation_state_change(state_change)
    
    # Verify
    assert result['alert_sent'] is True
    assert result['violation_id'] == "violation-456"
    router.send_alert.assert_called_once()
    snapshot_client.get_snapshot_urls.assert_called_once_with("violation-456")
    ack_repo.has_acknowledgement.assert_called_once_with("violation-456")


def test_process_violation_state_change_acknowledged():
    """Test alert suppressed when violation is acknowledged"""
    router = Mock(spec=AlertRouter)
    snapshot_client = Mock(spec=SnapshotClient)
    
    ack_repo = Mock(spec=AcknowledgementRepository)
    ack_repo.has_acknowledgement = Mock(return_value=True)  # Acknowledged
    
    processor = AlertProcessor(
        alert_router=router,
        snapshot_client=snapshot_client,
        acknowledgement_repository=ack_repo
    )
    
    state_change = ViolationStateChange(
        message_id="msg-123",
        violation_id="violation-456",
        tenant_id="tenant-789",
        worksite_id="worksite-001",
        camera_id="camera-002",
        violation_type="NO_HELMET",
        old_state="PENDING",
        new_state="ACTIVE",
        transition_reason="threshold_met",
        should_alert=True,
        timestamp=datetime.utcnow().isoformat() + 'Z',
        metadata={},
        raw_message={}
    )
    
    result = processor.process_violation_state_change(state_change)
    
    assert result['alert_sent'] is False
    router.send_alert.assert_not_called()
    snapshot_client.get_snapshot_urls.assert_not_called()


def test_process_violation_state_change_missing_snapshot():
    """Test alert not sent when snapshot required but missing"""
    router = Mock(spec=AlertRouter)
    
    snapshot_client = Mock(spec=SnapshotClient)
    snapshot_client.get_snapshot_urls = Mock(return_value={
        'snapshot_url': None,
        'clip_url': None
    })
    
    ack_repo = Mock(spec=AcknowledgementRepository)
    ack_repo.has_acknowledgement = Mock(return_value=False)
    
    processor = AlertProcessor(
        alert_router=router,
        snapshot_client=snapshot_client,
        acknowledgement_repository=ack_repo,
        require_snapshots=True  # Required
    )
    
    state_change = ViolationStateChange(
        message_id="msg-123",
        violation_id="violation-456",
        tenant_id="tenant-789",
        worksite_id="worksite-001",
        camera_id="camera-002",
        violation_type="NO_HELMET",
        old_state="PENDING",
        new_state="ACTIVE",
        transition_reason="threshold_met",
        should_alert=True,
        timestamp=datetime.utcnow().isoformat() + 'Z',
        metadata={},
        raw_message={}
    )
    
    result = processor.process_violation_state_change(state_change)
    
    assert result['alert_sent'] is False
    assert result['error'] == 'snapshot_url_required'
    router.send_alert.assert_not_called()


def test_process_violation_state_change_wrong_state():
    """Test alert not sent for non-ACTIVE/ESCALATED states"""
    router = Mock(spec=AlertRouter)
    snapshot_client = Mock(spec=SnapshotClient)
    ack_repo = Mock(spec=AcknowledgementRepository)
    
    processor = AlertProcessor(
        alert_router=router,
        snapshot_client=snapshot_client,
        acknowledgement_repository=ack_repo
    )
    
    # PENDING state should not trigger alert
    state_change = ViolationStateChange(
        message_id="msg-123",
        violation_id="violation-456",
        tenant_id="tenant-789",
        worksite_id="worksite-001",
        camera_id="camera-002",
        violation_type="NO_HELMET",
        old_state="",
        new_state="PENDING",
        transition_reason="",
        should_alert=False,
        timestamp=datetime.utcnow().isoformat() + 'Z',
        metadata={},
        raw_message={}
    )
    
    result = processor.process_violation_state_change(state_change)
    
    assert result['alert_sent'] is False
    router.send_alert.assert_not_called()
    snapshot_client.get_snapshot_urls.assert_not_called()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

