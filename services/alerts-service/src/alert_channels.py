"""
Alert Channels

Implementations for different alert delivery channels:
- WebSocket
- Email (Gmail)
- SMS (Twilio)
"""
import logging
import json
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from datetime import datetime

logger = logging.getLogger(__name__)


class AlertChannel(ABC):
    """Abstract base class for alert channels"""
    
    @abstractmethod
    def send_alert(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        severity: str,
        state: str,
        snapshot_url: Optional[str] = None,
        clip_url: Optional[str] = None,
        recipients: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """
        Send alert via this channel.
        
        Returns:
            True if sent successfully, False otherwise
        """
        pass
    
    @abstractmethod
    def get_channel_name(self) -> str:
        """Get channel name"""
        pass


class WebSocketAlertChannel(AlertChannel):
    """
    WebSocket alert channel.
    
    Publishes alerts to WebSocket connections via Redis Pub/Sub.
    """
    
    def __init__(self, redis_client):
        """
        Initialize WebSocket channel.
        
        Args:
            redis_client: Redis client for Pub/Sub
        """
        self.redis = redis_client
        self.pubsub_channel = "alerts:websocket"
    
    def get_channel_name(self) -> str:
        return "websocket"
    
    def send_alert(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        severity: str,
        state: str,
        snapshot_url: Optional[str] = None,
        clip_url: Optional[str] = None,
        recipients: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Publish alert to WebSocket channel via Redis Pub/Sub"""
        try:
            alert_payload = {
                'violation_id': violation_id,
                'tenant_id': tenant_id,
                'worksite_id': worksite_id,
                'camera_id': camera_id,
                'violation_type': violation_type,
                'severity': severity,
                'state': state,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'snapshot_url': snapshot_url,
                'clip_url': clip_url,
                'metadata': metadata or {}
            }
            
            # Publish to tenant-specific channel
            channel = f"{self.pubsub_channel}:tenant:{tenant_id}"
            self.redis.publish(channel, json.dumps(alert_payload))
            
            logger.info(
                f"WebSocket alert published",
                extra={
                    'violation_id': violation_id,
                    'tenant_id': tenant_id,
                    'channel': channel,
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(
                f"Failed to publish WebSocket alert: {e}",
                extra={'violation_id': violation_id},
                exc_info=True
            )
            return False


class EmailAlertChannel(AlertChannel):
    """
    Email alert channel using Gmail SMTP.
    """
    
    def __init__(
        self,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 587,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        from_email: Optional[str] = None
    ):
        """
        Initialize email channel.
        
        Args:
            smtp_host: SMTP server host
            smtp_port: SMTP server port
            smtp_user: SMTP username (Gmail email)
            smtp_password: SMTP password (Gmail app password)
            from_email: From email address
        """
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_email = from_email or smtp_user
    
    def get_channel_name(self) -> str:
        return "email"
    
    def send_alert(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        severity: str,
        state: str,
        snapshot_url: Optional[str] = None,
        clip_url: Optional[str] = None,
        recipients: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Send email alert"""
        if not recipients:
            logger.warning("No email recipients provided")
            return False
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Safety Violation Alert: {violation_type} ({severity})"
            msg['From'] = self.from_email
            msg['To'] = ', '.join(recipients)
            
            # Create email body
            text_body = f"""
Safety Violation Alert

Violation ID: {violation_id}
Type: {violation_type}
Severity: {severity}
State: {state}
Worksite ID: {worksite_id}
Camera ID: {camera_id}

Timestamp: {datetime.utcnow().isoformat()}

{f'Snapshot: {snapshot_url}' if snapshot_url else ''}
{f'Video Clip: {clip_url}' if clip_url else ''}
"""
            
            html_body = f"""
<html>
<body>
<h2>Safety Violation Alert</h2>
<p><strong>Violation ID:</strong> {violation_id}</p>
<p><strong>Type:</strong> {violation_type}</p>
<p><strong>Severity:</strong> {severity}</p>
<p><strong>State:</strong> {state}</p>
<p><strong>Worksite ID:</strong> {worksite_id}</p>
<p><strong>Camera ID:</strong> {camera_id}</p>
<p><strong>Timestamp:</strong> {datetime.utcnow().isoformat()}</p>
{f'<p><a href="{snapshot_url}">View Snapshot</a></p>' if snapshot_url else ''}
{f'<p><a href="{clip_url}">View Video Clip</a></p>' if clip_url else ''}
</body>
</html>
"""
            
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(
                f"Email alert sent",
                extra={
                    'violation_id': violation_id,
                    'recipients': recipients,
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(
                f"Failed to send email alert: {e}",
                extra={'violation_id': violation_id},
                exc_info=True
            )
            return False


class SMSAlertChannel(AlertChannel):
    """
    SMS alert channel using Twilio.
    """
    
    def __init__(
        self,
        twilio_account_sid: Optional[str] = None,
        twilio_auth_token: Optional[str] = None,
        twilio_from_number: Optional[str] = None
    ):
        """
        Initialize SMS channel.
        
        Args:
            twilio_account_sid: Twilio account SID
            twilio_auth_token: Twilio auth token
            twilio_from_number: Twilio phone number (sender)
        """
        self.account_sid = twilio_account_sid
        self.auth_token = twilio_auth_token
        self.from_number = twilio_from_number
    
    def get_channel_name(self) -> str:
        return "sms"
    
    def send_alert(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        severity: str,
        state: str,
        snapshot_url: Optional[str] = None,
        clip_url: Optional[str] = None,
        recipients: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """Send SMS alert via Twilio"""
        if not recipients:
            logger.warning("No SMS recipients provided")
            return False
        
        try:
            from twilio.rest import Client
            
            client = Client(self.account_sid, self.auth_token)
            
            # Create message body (SMS has 160 char limit, be concise)
            message_body = (
                f"Alert: {violation_type} ({severity})\n"
                f"ID: {violation_id[:8]}...\n"
                f"State: {state}"
            )
            if snapshot_url:
                message_body += f"\nSnapshot: {snapshot_url}"
            
            # Send to each recipient
            for recipient in recipients:
                client.messages.create(
                    body=message_body,
                    from_=self.from_number,
                    to=recipient
                )
            
            logger.info(
                f"SMS alert sent",
                extra={
                    'violation_id': violation_id,
                    'recipients': recipients,
                }
            )
            
            return True
            
        except ImportError:
            logger.error("Twilio library not installed. Install with: pip install twilio")
            return False
        except Exception as e:
            logger.error(
                f"Failed to send SMS alert: {e}",
                extra={'violation_id': violation_id},
                exc_info=True
            )
            return False

