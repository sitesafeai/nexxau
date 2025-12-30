"""
State Manager

Manages violation state transitions with acknowledgement logic.

Rules:
- Violation remains OPEN if condition persists (acknowledgement doesn't auto-resolve)
- Escalate if not acknowledged in time
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)


class ViolationState(str, Enum):
    """Violation states"""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"


class StateManager:
    """
    Manages violation state transitions with acknowledgement logic.
    
    State transition rules:
    - Violation can be ACKNOWLEDGED from ACTIVE or ESCALATED
    - Acknowledged violations remain OPEN (ACTIVE/ESCALATED) if condition persists
    - Violations escalate if not acknowledged within timeout
    - Resolution happens when condition no longer persists (separate logic)
    """
    
    def __init__(
        self,
        acknowledgement_timeout_minutes: int = 30,
        escalation_timeout_minutes: int = 60
    ):
        """
        Initialize state manager.
        
        Args:
            acknowledgement_timeout_minutes: Minutes before escalating unacknowledged violations (default: 30)
            escalation_timeout_minutes: Minutes before escalating acknowledged but unresolved violations (default: 60)
        """
        self.acknowledgement_timeout_minutes = acknowledgement_timeout_minutes
        self.escalation_timeout_minutes = escalation_timeout_minutes
    
    def should_escalate_for_acknowledgement_timeout(
        self,
        violation_state: str,
        violation_created_at: datetime,
        has_acknowledgement: bool,
        current_time: Optional[datetime] = None
    ) -> bool:
        """
        Check if violation should escalate due to acknowledgement timeout.
        
        Rules:
        - If violation is ACTIVE and not acknowledged within timeout → escalate to ESCALATED
        - If violation is ACKNOWLEDGED but unresolved → escalate to ESCALATED
        
        Args:
            violation_state: Current violation state
            violation_created_at: When violation was created
            has_acknowledgement: Whether violation has acknowledgement
            current_time: Current time (default: datetime.utcnow())
            
        Returns:
            True if should escalate, False otherwise
        """
        current_time = current_time or datetime.utcnow()
        
        # If already escalated, don't escalate again
        if violation_state == ViolationState.ESCALATED.value:
            return False
        
        # If resolved, don't escalate
        if violation_state == ViolationState.RESOLVED.value:
            return False
        
        # Calculate time since violation creation
        time_since_creation = (current_time - violation_created_at).total_seconds() / 60
        
        # If acknowledged, use longer timeout
        if has_acknowledgement:
            # Acknowledged but unresolved violations escalate after longer timeout
            return time_since_creation >= self.escalation_timeout_minutes
        else:
            # Unacknowledged violations escalate after acknowledgement timeout
            return time_since_creation >= self.acknowledgement_timeout_minutes
    
    def get_state_after_acknowledgement(
        self,
        current_state: str,
        condition_persists: bool = True
    ) -> str:
        """
        Determine state after acknowledgement.
        
        Rules:
        - If condition persists → state becomes ACKNOWLEDGED (but remains "open" for monitoring)
        - If condition doesn't persist → state becomes RESOLVED
        
        Note: In practice, ACKNOWLEDGED state might not be needed if we track acknowledgement separately.
        For simplicity, we keep the violation in ACTIVE/ESCALATED state but mark it as acknowledged.
        
        Args:
            current_state: Current violation state
            condition_persists: Whether violation condition still persists
            
        Returns:
            New state after acknowledgement
        """
        if current_state == ViolationState.RESOLVED.value:
            return current_state  # Already resolved
        
        if not condition_persists:
            # Condition no longer exists → resolve
            return ViolationState.RESOLVED.value
        
        # Condition persists → mark as acknowledged but keep state as ACTIVE/ESCALATED
        # The acknowledgement is tracked separately, violation state remains "open"
        if current_state == ViolationState.ACTIVE.value:
            return ViolationState.ACTIVE.value  # Remain ACTIVE, but acknowledged
        elif current_state == ViolationState.ESCALATED.value:
            return ViolationState.ESCALATED.value  # Remain ESCALATED, but acknowledged
        else:
            return current_state
    
    def get_state_transition(
        self,
        current_state: str,
        has_acknowledgement: bool,
        condition_persists: bool,
        violation_created_at: datetime,
        current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Determine state transition based on current conditions.
        
        Args:
            current_state: Current violation state
            has_acknowledgement: Whether violation is acknowledged
            condition_persists: Whether violation condition still exists
            violation_created_at: When violation was created
            current_time: Current time (default: datetime.utcnow())
            
        Returns:
            Dict with:
            - new_state: New state
            - should_escalate: Whether should escalate
            - transition_reason: Reason for transition
        """
        current_time = current_time or datetime.utcnow()
        
        # If condition doesn't persist, resolve
        if not condition_persists:
            return {
                'new_state': ViolationState.RESOLVED.value,
                'should_escalate': False,
                'transition_reason': 'condition_no_longer_persists'
            }
        
        # Check for escalation timeout
        should_escalate = self.should_escalate_for_acknowledgement_timeout(
            violation_state=current_state,
            violation_created_at=violation_created_at,
            has_acknowledgement=has_acknowledgement,
            current_time=current_time
        )
        
        if should_escalate and current_state != ViolationState.ESCALATED.value:
            return {
                'new_state': ViolationState.ESCALATED.value,
                'should_escalate': True,
                'transition_reason': 'acknowledgement_timeout' if not has_acknowledgement else 'unresolved_timeout'
            }
        
        # No state change needed
        return {
            'new_state': current_state,
            'should_escalate': False,
            'transition_reason': 'no_change'
        }

