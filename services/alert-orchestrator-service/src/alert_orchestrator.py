"""
Alert Orchestrator

Main orchestrator that coordinates alert delivery with rate limiting,
escalation, and retry logic.
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from .alert_channels import AlertChannel
from .rate_limiter import RateLimiter
from .escalation_manager import EscalationManager
from .retry_handler import RetryHandler, FailureLogger
from .sms_rate_limiter import SMSRateLimiter

logger = logging.getLogger(__name__)


class AlertOrchestrator:
    """
    Orchestrates alert delivery with rate limiting, escalation, and retries.
    
    Responsibilities:
    - Check rate limits (per camera and per user)
    - Determine severity based on escalation rules
    - Select channels based on severity
    - Execute retry logic with backoff
    - Log failures
    """
    
    def __init__(
        self,
        channels: Dict[str, AlertChannel],
        rate_limiter: RateLimiter,
        escalation_manager: EscalationManager,
        retry_handler: RetryHandler,
        failure_logger: FailureLogger,
        sms_rate_limiter: Optional[SMSRateLimiter] = None
    ):
        """
        Initialize alert orchestrator.
        
        Args:
            channels: Dict mapping channel names to AlertChannel instances
            rate_limiter: RateLimiter instance
            escalation_manager: EscalationManager instance
            retry_handler: RetryHandler instance
            failure_logger: FailureLogger instance
        """
        self.channels = channels
        self.rate_limiter = rate_limiter
        self.escalation_manager = escalation_manager
        self.retry_handler = retry_handler
        self.failure_logger = failure_logger
        self.sms_rate_limiter = sms_rate_limiter
    
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
        violation_timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send alert through orchestrated delivery process.
        
        Process:
        1. Check rate limits (camera and user)
        2. Determine severity (with escalation)
        3. Select channels based on severity
        4. Send to each channel with retry logic
        5. Log failures
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            worksite_id: Worksite identifier
            camera_id: Camera identifier
            violation_type: Violation type
            state: Violation state (ACTIVE, ESCALATED, etc.)
            snapshot_url: URL to snapshot image
            clip_url: URL to video clip
            recipients: Dict mapping channel names to recipient lists
            violation_timestamp: Timestamp of violation
            metadata: Additional metadata
            
        Returns:
            Dict with delivery results:
            {
                'success': bool,
                'severity': str,
                'channels': {channel_name: success_status},
                'rate_limited': bool,
                'rate_limit_reason': Optional[str],
                'errors': List[str]
            }
        """
        result = {
            'success': False,
            'severity': None,
            'channels': {},
            'rate_limited': False,
            'rate_limit_reason': None,
            'errors': []
        }
        
        try:
            # Extract user IDs from recipients (for rate limiting)
            user_ids = self._extract_user_ids(recipients)
            
            # Step 1: Check rate limits
            allowed, rate_limit_reason = self.rate_limiter.check_rate_limit(
                camera_id=camera_id,
                user_ids=user_ids
            )
            
            if not allowed:
                result['rate_limited'] = True
                result['rate_limit_reason'] = rate_limit_reason
                logger.info(
                    f"Alert rate-limited",
                    extra={
                        'violation_id': violation_id,
                        'camera_id': camera_id,
                        'reason': rate_limit_reason,
                    }
                )
                return result
            
            # Step 2: Determine severity with escalation
            severity = self.escalation_manager.determine_severity(
                violation_id=violation_id,
                state=state,
                violation_timestamp=violation_timestamp,
                previous_severity=metadata.get('previous_severity') if metadata else None
            )
            result['severity'] = severity
            
            # Step 3: Select channels based on severity
            base_channels = list(self.channels.keys())
            target_channels = self.escalation_manager.get_escalation_channels(
                severity=severity,
                base_channels=base_channels
            )
            
            # Step 4: Send to each channel with retry logic
            all_success = True
            
            for channel_name in target_channels:
                if channel_name not in self.channels:
                    logger.warning(f"Channel {channel_name} not available")
                    continue
                
                # SMS rate limiting check and fallback
                if channel_name == 'sms' and self.sms_rate_limiter:
                    is_allowed, reason, remaining = self.sms_rate_limiter.is_allowed(tenant_id)
                    if not is_allowed:
                        logger.warning(
                            f"SMS rate limit exceeded, falling back to email",
                            extra={
                                'tenant_id': tenant_id,
                                'reason': reason,
                                'remaining': remaining
                            }
                        )
                        # Fallback to email
                        if 'email' in self.channels:
                            channel_name = 'email'
                        else:
                            logger.error("SMS rate limited and email channel not available")
                            result['errors'].append(f"SMS rate limited ({reason}) and no fallback")
                            continue
                
                channel = self.channels[channel_name]
                channel_recipients = (recipients or {}).get(channel_name, [])
                
                # Socket.IO doesn't need explicit recipients (broadcasts to tenant)
                if channel_name == 'socketio':
                    channel_recipients = None
                
                # Send with retry
                def send_func():
                    return channel.send_alert(
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
                
                success, error = self.retry_handler.execute_with_retry(
                    func=send_func,
                    operation_name=f"send_alert_{channel_name}",
                    context={
                        'violation_id': violation_id,
                        'channel': channel_name,
                        'severity': severity,
                    }
                )
                
                result['channels'][channel_name] = success
                
                if success:
                    # Record successful alert for rate limiting
                    self.rate_limiter.record_alert(
                        camera_id=camera_id,
                        user_ids=user_ids
                    )
                    
                    # Log success (if retried)
                    attempt_count = self.retry_handler.max_attempts if error else 1
                    self.failure_logger.log_success(
                        violation_id=violation_id,
                        channel=channel_name,
                        attempt=attempt_count,
                        context={'severity': severity}
                    )
                else:
                    all_success = False
                    error_msg = f"{channel_name}: {str(error) if error else 'Unknown error'}"
                    result['errors'].append(error_msg)
                    
                    # Log failure
                    self.failure_logger.log_failure(
                        violation_id=violation_id,
                        channel=channel_name,
                        error=error or Exception("Unknown error"),
                        attempt=self.retry_handler.max_attempts,
                        max_attempts=self.retry_handler.max_attempts,
                        context={'severity': severity}
                    )
            
            result['success'] = all_success
            
        except Exception as e:
            logger.error(
                f"Error in alert orchestration: {e}",
                extra={'violation_id': violation_id},
                exc_info=True
            )
            result['errors'].append(f"Orchestration error: {str(e)}")
        
        return result
    
    def _extract_user_ids(self, recipients: Optional[Dict[str, List[str]]]) -> List[str]:
        """
        Extract user IDs from recipients dict.
        
        Assumes user IDs are in the recipient values (email addresses or phone numbers).
        In production, would map recipients to user IDs via database lookup.
        
        Args:
            recipients: Dict mapping channel names to recipient lists
            
        Returns:
            List of user IDs (or recipient identifiers)
        """
        if not recipients:
            return []
        
        # Collect all unique recipients across channels
        user_ids = set()
        for channel_recipients in recipients.values():
            user_ids.update(channel_recipients)
        
        return list(user_ids)

