"""
Alert Router

Routes alerts to appropriate channels based on configuration and rules.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .alert_channels import AlertChannel, WebSocketAlertChannel, EmailAlertChannel, SMSAlertChannel

logger = logging.getLogger(__name__)


class AlertRouter:
    """
    Routes alerts to configured channels.
    
    Handles:
    - Channel selection based on configuration
    - Suppression window to avoid alert flooding
    - Escalation severity handling
    """
    
    def __init__(
        self,
        channels: List[AlertChannel],
        suppression_window_seconds: int = 60,
        enable_websocket: bool = True,
        enable_email: bool = True,
        enable_sms: bool = True
    ):
        """
        Initialize alert router.
        
        Args:
            channels: List of alert channels
            suppression_window_seconds: Time window to suppress repeat alerts (default: 60)
            enable_websocket: Enable WebSocket channel
            enable_email: Enable email channel
            enable_sms: Enable SMS channel
        """
        self.channels = channels
        self.suppression_window_seconds = suppression_window_seconds
        self.enable_websocket = enable_websocket
        self.enable_email = enable_email
        self.enable_sms = enable_sms
        
        # Track last alert time per violation (in-memory cache)
        # In production, use Redis or database for distributed systems
        self._last_alert_time: Dict[str, datetime] = {}
    
    def should_suppress_alert(
        self,
        violation_id: str,
        last_alert_at: Optional[datetime] = None
    ) -> bool:
        """
        Check if alert should be suppressed (within suppression window).
        
        Args:
            violation_id: Violation identifier
            last_alert_at: Last alert time (if provided, used instead of cache)
            
        Returns:
            True if alert should be suppressed, False otherwise
        """
        if last_alert_at:
            time_since_last_alert = (datetime.utcnow() - last_alert_at).total_seconds()
            return time_since_last_alert < self.suppression_window_seconds
        
        # Check in-memory cache
        if violation_id in self._last_alert_time:
            time_since_last_alert = (
                datetime.utcnow() - self._last_alert_time[violation_id]
            ).total_seconds()
            if time_since_last_alert < self.suppression_window_seconds:
                return True
        
        return False
    
    def get_severity_for_state(self, state: str) -> str:
        """
        Map violation state to severity level.
        
        Rules:
        - ACTIVE -> MEDIUM
        - ESCALATED -> HIGH
        
        Returns:
            Severity string (LOW, MEDIUM, HIGH, CRITICAL)
        """
        if state == 'ESCALATED':
            return 'HIGH'
        elif state == 'ACTIVE':
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def send_alert(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        state: str,
        snapshot_url: Optional[str] = None,
        clip_url: Optional[str] = None,
        recipients: Optional[Dict[str, List[str]]] = None,
        last_alert_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, bool]:
        """
        Route alert to appropriate channels.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            worksite_id: Worksite identifier
            camera_id: Camera identifier
            violation_type: Violation type
            state: Violation state (ACTIVE, ESCALATED)
            snapshot_url: URL to snapshot image
            clip_url: URL to video clip
            recipients: Dict mapping channel names to recipient lists
                Example: {'email': ['user@example.com'], 'sms': ['+1234567890']}
            last_alert_at: Last alert time (for suppression check)
            metadata: Additional metadata
            
        Returns:
            Dict mapping channel names to success status
        """
        # Check suppression
        if self.should_suppress_alert(violation_id, last_alert_at):
            logger.info(
                f"Alert suppressed (within suppression window)",
                extra={
                    'violation_id': violation_id,
                    'suppression_window_seconds': self.suppression_window_seconds,
                }
            )
            return {}
        
        # Get severity from state
        severity = self.get_severity_for_state(state)
        
        # Default recipients if not provided
        if not recipients:
            recipients = {}
        
        results = {}
        
        # Route to each enabled channel
        for channel in self.channels:
            channel_name = channel.get_channel_name()
            
            # Check if channel is enabled
            if channel_name == 'websocket' and not self.enable_websocket:
                continue
            if channel_name == 'email' and not self.enable_email:
                continue
            if channel_name == 'sms' and not self.enable_sms:
                continue
            
            # Get recipients for this channel
            channel_recipients = recipients.get(channel_name, [])
            
            # WebSocket doesn't need explicit recipients (broadcasts to tenant)
            if channel_name == 'websocket':
                channel_recipients = None
            
            # Send alert
            try:
                success = channel.send_alert(
                    violation_id=violation_id,
                    tenant_id=tenant_id,
                    worksite_id=worksite_id,
                    camera_id=camera_id,
                    violation_type=violation_type,
                    severity=severity,
                    state=state,
                    snapshot_url=snapshot_url,
                    clip_url=clip_url,
                    recipients=channel_recipients,
                    metadata=metadata
                )
                results[channel_name] = success
                
                # Update last alert time on success
                if success:
                    self._last_alert_time[violation_id] = datetime.utcnow()
                    
            except Exception as e:
                logger.error(
                    f"Error sending alert via {channel_name}: {e}",
                    extra={'violation_id': violation_id},
                    exc_info=True
                )
                results[channel_name] = False
        
        return results

