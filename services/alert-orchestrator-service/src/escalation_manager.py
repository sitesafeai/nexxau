"""
Escalation Manager

Severity-based escalation logic for alerts.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class SeverityLevel(str, Enum):
    """Severity levels for alerts"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EscalationManager:
    """
    Manages severity-based escalation for alerts.
    
    Escalation rules:
    - ACTIVE state → MEDIUM severity
    - ESCALATED state → HIGH severity
    - Repeated HIGH severity → CRITICAL severity
    - Time-based escalation (persistent violations)
    """
    
    def __init__(
        self,
        critical_threshold_minutes: int = 15,
        escalation_time_window_minutes: int = 30
    ):
        """
        Initialize escalation manager.
        
        Args:
            critical_threshold_minutes: Minutes before escalating to CRITICAL (default: 15)
            escalation_time_window_minutes: Time window for tracking escalation (default: 30)
        """
        self.critical_threshold_minutes = critical_threshold_minutes
        self.escalation_time_window_minutes = escalation_time_window_minutes
        
        # Track violation escalation state
        # Format: {violation_id: {'first_seen': datetime, 'last_severity': str, 'escalation_count': int}}
        self._violation_state: Dict[str, Dict[str, Any]] = {}
    
    def determine_severity(
        self,
        violation_id: str,
        state: str,
        violation_timestamp: Optional[datetime] = None,
        previous_severity: Optional[str] = None
    ) -> str:
        """
        Determine alert severity based on state and escalation rules.
        
        Args:
            violation_id: Violation identifier
            state: Violation state (ACTIVE, ESCALATED, etc.)
            violation_timestamp: Timestamp of violation
            previous_severity: Previous severity level (if known)
            
        Returns:
            Severity level (LOW, MEDIUM, HIGH, CRITICAL)
        """
        current_time = violation_timestamp or datetime.utcnow()
        
        # Base severity from state
        if state == 'ESCALATED':
            base_severity = SeverityLevel.HIGH
        elif state == 'ACTIVE':
            base_severity = SeverityLevel.MEDIUM
        else:
            base_severity = SeverityLevel.LOW
        
        # Check for escalation to CRITICAL
        if base_severity in (SeverityLevel.HIGH, SeverityLevel.MEDIUM):
            violation_state = self._violation_state.get(violation_id, {})
            
            first_seen = violation_state.get('first_seen')
            if not first_seen:
                # First time seeing this violation
                self._violation_state[violation_id] = {
                    'first_seen': current_time,
                    'last_severity': base_severity.value,
                    'escalation_count': 0
                }
            else:
                # Check if we should escalate to CRITICAL
                time_since_first_seen = (current_time - first_seen).total_seconds() / 60
                
                if time_since_first_seen >= self.critical_threshold_minutes:
                    # Escalate to CRITICAL
                    logger.info(
                        f"Escalating violation to CRITICAL severity",
                        extra={
                            'violation_id': violation_id,
                            'time_since_first_seen_minutes': time_since_first_seen,
                            'threshold_minutes': self.critical_threshold_minutes,
                        }
                    )
                    
                    self._violation_state[violation_id]['last_severity'] = SeverityLevel.CRITICAL.value
                    self._violation_state[violation_id]['escalation_count'] += 1
                    
                    return SeverityLevel.CRITICAL.value
                
                # Update state
                self._violation_state[violation_id]['last_severity'] = base_severity.value
            
            return base_severity.value
        
        return base_severity.value
    
    def get_escalation_channels(
        self,
        severity: str,
        base_channels: list
    ) -> list:
        """
        Determine which channels should receive alert based on severity.
        
        Escalation rules:
        - LOW/MEDIUM: Standard channels (Socket.IO, Email)
        - HIGH: Add SMS channel
        - CRITICAL: All channels + additional escalation channels
        
        Args:
            severity: Severity level
            base_channels: Base list of channels to use
            
        Returns:
            List of channel names
        """
        channels = list(base_channels)
        
        if severity == SeverityLevel.HIGH.value:
            # HIGH severity: ensure SMS is included
            if 'sms' not in channels:
                channels.append('sms')
        elif severity == SeverityLevel.CRITICAL.value:
            # CRITICAL: all channels
            all_channels = ['socketio', 'email', 'sms']
            channels = list(set(channels + all_channels))
        
        return channels
    
    def clear_violation_state(self, violation_id: str) -> None:
        """Clear escalation state for a violation (e.g., when resolved)"""
        if violation_id in self._violation_state:
            del self._violation_state[violation_id]
            logger.debug(f"Cleared escalation state for violation {violation_id}")

