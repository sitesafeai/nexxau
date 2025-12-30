"""
Tests for Alert Router

Tests alert routing, suppression, and escalation logic.
"""
import pytest
from unittest.mock import Mock, MagicMock
from datetime import datetime, timedelta

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from alert_router import AlertRouter
from alert_channels import AlertChannel


class MockAlertChannel(AlertChannel):
    """Mock alert channel for testing"""
    def __init__(self, name, should_succeed=True):
        self.name = name
        self.should_succeed = should_succeed
        self.send_calls = []
    
    def get_channel_name(self) -> str:
        return self.name
    
    def send_alert(self, **kwargs) -> bool:
        self.send_calls.append(kwargs)
        return self.should_succeed


def test_router_sends_to_all_channels():
    """Test router sends alert to all enabled channels"""
    channel1 = MockAlertChannel("websocket", should_succeed=True)
    channel2 = MockAlertChannel("email", should_succeed=True)
    
    router = AlertRouter(
        channels=[channel1, channel2],
        enable_websocket=True,
        enable_email=True,
        enable_sms=False
    )
    
    results = router.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        state="ACTIVE"
    )
    
    assert "websocket" in results
    assert "email" in results
    assert results["websocket"] is True
    assert results["email"] is True
    assert len(channel1.send_calls) == 1
    assert len(channel2.send_calls) == 1


def test_router_suppression_window():
    """Test router suppresses alerts within suppression window"""
    channel = MockAlertChannel("websocket")
    
    router = AlertRouter(
        channels=[channel],
        suppression_window_seconds=60
    )
    
    # First alert should be sent
    router.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        state="ACTIVE"
    )
    
    assert len(channel.send_calls) == 1
    
    # Second alert within window should be suppressed
    results = router.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        state="ACTIVE"
    )
    
    assert results == {}
    assert len(channel.send_calls) == 1  # No additional call


def test_router_suppression_with_last_alert_at():
    """Test router respects last_alert_at parameter"""
    channel = MockAlertChannel("websocket")
    
    router = AlertRouter(
        channels=[channel],
        suppression_window_seconds=60
    )
    
    # Alert with recent last_alert_at should be suppressed
    recent_time = datetime.utcnow() - timedelta(seconds=30)
    results = router.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        state="ACTIVE",
        last_alert_at=recent_time
    )
    
    assert results == {}
    assert len(channel.send_calls) == 0


def test_router_severity_mapping():
    """Test router maps state to severity correctly"""
    router = AlertRouter(channels=[])
    
    assert router.get_severity_for_state('ACTIVE') == 'MEDIUM'
    assert router.get_severity_for_state('ESCALATED') == 'HIGH'
    assert router.get_severity_for_state('PENDING') == 'LOW'


def test_router_channel_filtering():
    """Test router only sends to enabled channels"""
    channel1 = MockAlertChannel("websocket")
    channel2 = MockAlertChannel("email")
    channel3 = MockAlertChannel("sms")
    
    router = AlertRouter(
        channels=[channel1, channel2, channel3],
        enable_websocket=True,
        enable_email=False,
        enable_sms=False
    )
    
    router.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        state="ACTIVE"
    )
    
    assert len(channel1.send_calls) == 1
    assert len(channel2.send_calls) == 0
    assert len(channel3.send_calls) == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

