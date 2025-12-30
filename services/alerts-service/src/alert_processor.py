"""
Alert Processor

Main orchestrator for processing violation state changes and sending alerts.
"""
import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime
from .violation_consumer import ViolationStateChange
from .alert_router import AlertRouter
from .snapshot_client import SnapshotClient
from .acknowledgement_repository import AcknowledgementRepository

logger = logging.getLogger(__name__)


class AlertProcessor:
    """
    Processes violation state changes and sends alerts.
    
    Handles:
    - Snapshot URL fetching
    - Acknowledgement checking
    - Alert routing
    - Retry logic
    """
    
    def __init__(
        self,
        alert_router: AlertRouter,
        snapshot_client: SnapshotClient,
        acknowledgement_repository: AcknowledgementRepository,
        require_snapshots: bool = True,
        retry_max_attempts: int = 3,
        retry_backoff_seconds: float = 1.0
    ):
        """
        Initialize alert processor.
        
        Args:
            alert_router: AlertRouter instance
            snapshot_client: SnapshotClient instance
            acknowledgement_repository: AcknowledgementRepository instance
            require_snapshots: Require snapshot URLs before sending (default: True)
            retry_max_attempts: Maximum retry attempts for failed alerts (default: 3)
            retry_backoff_seconds: Backoff time between retries in seconds (default: 1.0)
        """
        self.router = alert_router
        self.snapshot_client = snapshot_client
        self.ack_repo = acknowledgement_repository
        self.require_snapshots = require_snapshots
        self.retry_max_attempts = retry_max_attempts
        self.retry_backoff_seconds = retry_backoff_seconds
    
    def process_violation_state_change(
        self,
        state_change: ViolationStateChange
    ) -> Dict[str, Any]:
        """
        Process violation state change and send alerts.
        
        Args:
            state_change: Violation state change event
            
        Returns:
            Dict with processing results
        """
        result = {
            'violation_id': state_change.violation_id,
            'alert_sent': False,
            'channels': {},
            'error': None
        }
        
        try:
            # Check if alert should be sent
            if not state_change.should_send_alert():
                logger.debug(
                    f"Alert not required for state change",
                    extra={
                        'violation_id': state_change.violation_id,
                        'state': state_change.new_state,
                    }
                )
                return result
            
            # Check if violation is acknowledged (suppress alerts)
            if self.ack_repo.has_acknowledgement(state_change.violation_id):
                logger.info(
                    f"Alert suppressed (violation acknowledged)",
                    extra={
                        'violation_id': state_change.violation_id,
                    }
                )
                return result
            
            # Fetch snapshot URLs
            snapshot_urls = self.snapshot_client.get_snapshot_urls(
                state_change.violation_id
            )
            
            # Check if snapshots are required but not available
            if self.require_snapshots and not snapshot_urls.get('snapshot_url'):
                logger.warning(
                    f"Alert not sent (snapshot URL required but not available)",
                    extra={
                        'violation_id': state_change.violation_id,
                    }
                )
                result['error'] = 'snapshot_url_required'
                return result
            
            # Get recipients from metadata or configuration
            # In production, fetch from database based on tenant/worksite
            recipients = self._get_recipients(state_change)
            
            # Send alert with retry logic
            channel_results = self._send_alert_with_retry(
                state_change=state_change,
                snapshot_url=snapshot_urls.get('snapshot_url'),
                clip_url=snapshot_urls.get('clip_url'),
                recipients=recipients
            )
            
            result['alert_sent'] = any(channel_results.values())
            result['channels'] = channel_results
            
        except Exception as e:
            logger.error(
                f"Error processing violation state change: {e}",
                extra={'violation_id': state_change.violation_id},
                exc_info=True
            )
            result['error'] = str(e)
        
        return result
    
    def _get_recipients(self, state_change: ViolationStateChange) -> Dict[str, list]:
        """
        Get recipients for alert channels.
        
        In production, would fetch from database based on tenant/worksite configuration.
        For now, returns empty dict (channels can use defaults).
        
        Args:
            state_change: Violation state change event
            
        Returns:
            Dict mapping channel names to recipient lists
        """
        # TODO: Fetch from database based on tenant/worksite alert configuration
        # Example structure:
        # {
        #     'email': ['safety@example.com', 'manager@example.com'],
        #     'sms': ['+1234567890']
        # }
        return {}
    
    def _send_alert_with_retry(
        self,
        state_change: ViolationStateChange,
        snapshot_url: Optional[str],
        clip_url: Optional[str],
        recipients: Dict[str, list]
    ) -> Dict[str, bool]:
        """
        Send alert with retry logic.
        
        Args:
            state_change: Violation state change event
            snapshot_url: Snapshot URL
            clip_url: Video clip URL
            recipients: Recipients per channel
            
        Returns:
            Dict mapping channel names to success status
        """
        attempt = 0
        last_error = None
        
        while attempt < self.retry_max_attempts:
            try:
                # Get last alert time from metadata if available
                last_alert_at = None
                if state_change.metadata and 'last_alert_at' in state_change.metadata:
                    try:
                        last_alert_at = datetime.fromisoformat(
                            state_change.metadata['last_alert_at'].replace('Z', '+00:00')
                        )
                    except Exception:
                        pass
                
                # Send alert
                channel_results = self.router.send_alert(
                    violation_id=state_change.violation_id,
                    tenant_id=state_change.tenant_id,
                    worksite_id=state_change.worksite_id,
                    camera_id=state_change.camera_id,
                    violation_type=state_change.violation_type,
                    state=state_change.new_state,
                    snapshot_url=snapshot_url,
                    clip_url=clip_url,
                    recipients=recipients,
                    last_alert_at=last_alert_at,
                    metadata=state_change.metadata
                )
                
                # If at least one channel succeeded, consider it successful
                if any(channel_results.values()):
                    return channel_results
                
                # All channels failed, retry
                attempt += 1
                if attempt < self.retry_max_attempts:
                    time.sleep(self.retry_backoff_seconds * attempt)  # Exponential backoff
                    logger.warning(
                        f"Alert send failed, retrying (attempt {attempt}/{self.retry_max_attempts})",
                        extra={'violation_id': state_change.violation_id}
                    )
                else:
                    logger.error(
                        f"Alert send failed after {self.retry_max_attempts} attempts",
                        extra={'violation_id': state_change.violation_id}
                    )
                    
            except Exception as e:
                last_error = e
                attempt += 1
                if attempt < self.retry_max_attempts:
                    time.sleep(self.retry_backoff_seconds * attempt)
                    logger.warning(
                        f"Alert send error, retrying: {e}",
                        extra={'violation_id': state_change.violation_id}
                    )
                else:
                    logger.error(
                        f"Alert send error after {self.retry_max_attempts} attempts: {e}",
                        extra={'violation_id': state_change.violation_id},
                        exc_info=True
                    )
        
        # All retries failed
        return {channel: False for channel in self.router.channels}

