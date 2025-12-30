"""
Tests for Alert Channels

Tests WebSocket, Email, and SMS alert channels.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
import json

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from alert_channels import WebSocketAlertChannel, EmailAlertChannel, SMSAlertChannel


def test_websocket_channel_send_success():
    """Test WebSocket channel sends alert successfully"""
    redis_client = Mock()
    redis_client.publish = Mock(return_value=1)
    
    channel = WebSocketAlertChannel(redis_client)
    
    result = channel.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        severity="MEDIUM",
        state="ACTIVE",
        snapshot_url="https://example.com/snapshot.jpg"
    )
    
    assert result is True
    redis_client.publish.assert_called_once()
    
    # Verify channel and payload
    call_args = redis_client.publish.call_args
    assert call_args[0][0] == "alerts:websocket:tenant:tenant-456"
    
    payload = json.loads(call_args[0][1])
    assert payload['violation_id'] == "violation-123"
    assert payload['violation_type'] == "NO_HELMET"
    assert payload['severity'] == "MEDIUM"
    assert payload['state'] == "ACTIVE"


def test_websocket_channel_send_failure():
    """Test WebSocket channel handles send failure"""
    redis_client = Mock()
    redis_client.publish = Mock(side_effect=Exception("Redis error"))
    
    channel = WebSocketAlertChannel(redis_client)
    
    result = channel.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        severity="MEDIUM",
        state="ACTIVE"
    )
    
    assert result is False


@patch('smtplib.SMTP')
def test_email_channel_send_success(mock_smtp):
    """Test Email channel sends alert successfully"""
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    channel = EmailAlertChannel(
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_user="test@example.com",
        smtp_password="password",
        from_email="test@example.com"
    )
    
    result = channel.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        severity="MEDIUM",
        state="ACTIVE",
        snapshot_url="https://example.com/snapshot.jpg",
        recipients=["recipient@example.com"]
    )
    
    assert result is True
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("test@example.com", "password")
    mock_server.send_message.assert_called_once()


def test_email_channel_no_recipients():
    """Test Email channel fails when no recipients provided"""
    channel = EmailAlertChannel(
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_user="test@example.com",
        smtp_password="password"
    )
    
    result = channel.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        severity="MEDIUM",
        state="ACTIVE",
        recipients=None
    )
    
    assert result is False


@patch('twilio.rest.Client')
def test_sms_channel_send_success(mock_twilio_client):
    """Test SMS channel sends alert successfully"""
    mock_client_instance = MagicMock()
    mock_message = MagicMock()
    mock_client_instance.messages.create = Mock(return_value=mock_message)
    mock_twilio_client.return_value = mock_client_instance
    
    channel = SMSAlertChannel(
        twilio_account_sid="test_sid",
        twilio_auth_token="test_token",
        twilio_from_number="+1234567890"
    )
    
    result = channel.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        severity="MEDIUM",
        state="ACTIVE",
        snapshot_url="https://example.com/snapshot.jpg",
        recipients=["+0987654321"]
    )
    
    assert result is True
    mock_client_instance.messages.create.assert_called_once()


def test_sms_channel_no_recipients():
    """Test SMS channel fails when no recipients provided"""
    channel = SMSAlertChannel(
        twilio_account_sid="test_sid",
        twilio_auth_token="test_token",
        twilio_from_number="+1234567890"
    )
    
    result = channel.send_alert(
        violation_id="violation-123",
        tenant_id="tenant-456",
        worksite_id="worksite-789",
        camera_id="camera-001",
        violation_type="NO_HELMET",
        severity="MEDIUM",
        state="ACTIVE",
        recipients=None
    )
    
    assert result is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

