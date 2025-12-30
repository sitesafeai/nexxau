"""
Violation State Machine

Implements deterministic state transition logic for violations.

STATE MACHINE DIAGRAM:
=====================================
                        [Detection Event]
                               |
                               v
                        ┌──────────────┐
                        │   PENDING    │  <-- Initial state (within sliding window)
                        └──────────────┘
                               |
                    [≥N detections in 10s window]
                               |
                               v
                        ┌──────────────┐
                        │    ACTIVE    │  <-- Confirmed violation
                        └──────────────┘
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
[>120s elapsed]   [No detection for 30s]   [Alert sent]
            |                  |                  |
            v                  v                  v
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │  ESCALATED   │   │   RESOLVED   │   │Suppressed    │
    └──────────────┘   └──────────────┘   │(60s cooldown)│
            |                              └──────────────┘
            |                                        |
            |                              [60s elapsed]
            |                                        |
            └────────────────────────────────────────┘
                               |
                    [No detection for 30s]
                               |
                               v
                        ┌──────────────┐
                        │   RESOLVED   │  <-- Terminal state
                        └──────────────┘

STATE TRANSITIONS:
- PENDING → ACTIVE: When ≥N detections occur within 10s sliding window
- ACTIVE → ESCALATED: When violation persists >120s (idempotent)
- ACTIVE → RESOLVED: When no detection for 30s
- ESCALATED → RESOLVED: When no detection for 30s
- ACTIVE → ACTIVE (suppressed): When alert sent, suppress for 60s

EDGE CASES:
1. Multiple detections in same window → Aggregate, count >= N triggers ACTIVE
2. Detection arrives after resolution → Create new PENDING violation
3. Escalation timing → Only escalate once, use first_seen_at for timing
4. Alert suppression → Track last_alert_at, suppress for 60s
5. Window boundaries → Use sliding window, not fixed windows
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from .violation_model import Violation, ViolationState


class StateTransitionResult:
    """Result of a state transition evaluation"""
    
    def __init__(
        self,
        new_state: ViolationState,
        should_alert: bool,
        transition_reason: str
    ):
        self.new_state = new_state
        self.should_alert = should_alert
        self.transition_reason = transition_reason


class ViolationStateMachine:
    """
    Deterministic violation state machine.
    
    Pure logic functions with no I/O dependencies.
    All functions are unit-testable.
    """
    
    def __init__(
        self,
        window_seconds: int = 10,
        detection_threshold: int = 3,
        escalation_seconds: int = 120,
        resolution_seconds: int = 30,
        suppression_seconds: int = 60
    ):
        """
        Initialize state machine with configurable parameters.
        
        Args:
            window_seconds: Sliding window size in seconds (default: 10)
            detection_threshold: Minimum detections to trigger ACTIVE (default: 3)
            escalation_seconds: Seconds before escalation (default: 120)
            resolution_seconds: Seconds without detection before resolution (default: 30)
            suppression_seconds: Alert suppression cooldown in seconds (default: 60)
        """
        self.window_seconds = window_seconds
        self.detection_threshold = detection_threshold
        self.escalation_seconds = escalation_seconds
        self.resolution_seconds = resolution_seconds
        self.suppression_seconds = suppression_seconds
    
    def evaluate_state_transition(
        self,
        violation: Violation,
        detection_timestamps: List[datetime],
        current_time: datetime
    ) -> StateTransitionResult:
        """
        Evaluate state transition based on current violation state and detection history.
        
        This is the main entry point for state machine logic.
        Pure function - no I/O, fully deterministic.
        
        Args:
            violation: Current violation instance
            detection_timestamps: List of detection timestamps (sorted, most recent first)
            current_time: Current timestamp for evaluation
            
        Returns:
            StateTransitionResult with new state and alert decision
        """
        # Update last_seen_at if we have recent detections
        if detection_timestamps:
            violation.update_last_seen(max(detection_timestamps))
        
        # State-specific transition logic
        if violation.state == ViolationState.PENDING:
            return self._evaluate_pending_transition(violation, detection_timestamps, current_time)
        elif violation.state == ViolationState.ACTIVE:
            return self._evaluate_active_transition(violation, detection_timestamps, current_time)
        elif violation.state == ViolationState.ESCALATED:
            return self._evaluate_escalated_transition(violation, detection_timestamps, current_time)
        elif violation.state == ViolationState.RESOLVED:
            return self._evaluate_resolved_transition(violation, detection_timestamps, current_time)
        else:
            # Unknown state - should not happen, but handle gracefully
            return StateTransitionResult(
                new_state=violation.state,
                should_alert=False,
                transition_reason="unknown_state"
            )
    
    def _evaluate_pending_transition(
        self,
        violation: Violation,
        detection_timestamps: List[datetime],
        current_time: datetime
    ) -> StateTransitionResult:
        """
        Evaluate transition from PENDING state.
        
        Transition to ACTIVE if ≥N detections within sliding window.
        Otherwise remain PENDING.
        """
        if not detection_timestamps:
            return StateTransitionResult(
                new_state=ViolationState.RESOLVED,
                should_alert=False,
                transition_reason="no_detections"
            )
        
        # Count detections within sliding window
        window_start = current_time - timedelta(seconds=self.window_seconds)
        detections_in_window = [
            ts for ts in detection_timestamps
            if ts >= window_start
        ]
        
        if len(detections_in_window) >= self.detection_threshold:
            return StateTransitionResult(
                new_state=ViolationState.ACTIVE,
                should_alert=True,
                transition_reason=f"threshold_met_{len(detections_in_window)}_in_window"
            )
        else:
            return StateTransitionResult(
                new_state=ViolationState.PENDING,
                should_alert=False,
                transition_reason=f"below_threshold_{len(detections_in_window)}_in_window"
            )
    
    def _evaluate_active_transition(
        self,
        violation: Violation,
        detection_timestamps: List[datetime],
        current_time: datetime
    ) -> StateTransitionResult:
        """
        Evaluate transition from ACTIVE state.
        
        Possible transitions:
        - ACTIVE → ESCALATED: If persisted >escalation_seconds (idempotent)
        - ACTIVE → RESOLVED: If no detections for resolution_seconds
        - ACTIVE → ACTIVE (suppressed): If recently alerted (suppression cooldown)
        """
        # Check for resolution (no detections for resolution_seconds)
        if not detection_timestamps:
            time_since_last_seen = (current_time - violation.last_seen_at).total_seconds()
            if time_since_last_seen >= self.resolution_seconds:
                return StateTransitionResult(
                    new_state=ViolationState.RESOLVED,
                    should_alert=False,
                    transition_reason=f"resolved_no_detections_{time_since_last_seen:.1f}s"
                )
        
        # Check for escalation (idempotent - only escalate once)
        time_since_first_seen = (current_time - violation.first_seen_at).total_seconds()
        if time_since_first_seen >= self.escalation_seconds and violation.state != ViolationState.ESCALATED:
            return StateTransitionResult(
                new_state=ViolationState.ESCALATED,
                should_alert=True,  # Alert on escalation
                transition_reason=f"escalated_{time_since_first_seen:.1f}s_persisted"
            )
        
        # Check alert suppression
        if violation.last_alert_at is not None:
            time_since_last_alert = (current_time - violation.last_alert_at).total_seconds()
            if time_since_last_alert < self.suppression_seconds:
                return StateTransitionResult(
                    new_state=ViolationState.ACTIVE,
                    should_alert=False,
                    transition_reason=f"suppressed_{time_since_last_alert:.1f}s_since_alert"
                )
        
        # If we have recent detections and not suppressed, should alert
        if detection_timestamps:
            window_start = current_time - timedelta(seconds=self.window_seconds)
            recent_detections = [ts for ts in detection_timestamps if ts >= window_start]
            if recent_detections:
                return StateTransitionResult(
                    new_state=ViolationState.ACTIVE,
                    should_alert=True,
                    transition_reason="active_violation_detected"
                )
        
        # Default: remain ACTIVE but don't alert
        return StateTransitionResult(
            new_state=ViolationState.ACTIVE,
            should_alert=False,
            transition_reason="active_no_recent_detections"
        )
    
    def _evaluate_escalated_transition(
        self,
        violation: Violation,
        detection_timestamps: List[datetime],
        current_time: datetime
    ) -> StateTransitionResult:
        """
        Evaluate transition from ESCALATED state.
        
        Transition to RESOLVED if no detections for resolution_seconds.
        Otherwise remain ESCALATED.
        """
        if not detection_timestamps:
            time_since_last_seen = (current_time - violation.last_seen_at).total_seconds()
            if time_since_last_seen >= self.resolution_seconds:
                return StateTransitionResult(
                    new_state=ViolationState.RESOLVED,
                    should_alert=False,
                    transition_reason=f"resolved_no_detections_{time_since_last_seen:.1f}s"
                )
        
        # Check alert suppression
        if violation.last_alert_at is not None:
            time_since_last_alert = (current_time - violation.last_alert_at).total_seconds()
            if time_since_last_alert < self.suppression_seconds:
                return StateTransitionResult(
                    new_state=ViolationState.ESCALATED,
                    should_alert=False,
                    transition_reason=f"suppressed_{time_since_last_alert:.1f}s_since_alert"
                )
        
        # If we have detections and not suppressed, could alert (optional - escalated violations)
        return StateTransitionResult(
            new_state=ViolationState.ESCALATED,
            should_alert=False,  # Escalated violations typically have different alerting logic
            transition_reason="escalated_persisting"
        )
    
    def _evaluate_resolved_transition(
        self,
        violation: Violation,
        detection_timestamps: List[datetime],
        current_time: datetime
    ) -> StateTransitionResult:
        """
        Evaluate transition from RESOLVED state.
        
        If new detections arrive, should create new PENDING violation (handled by caller).
        RESOLVED is terminal - this function should rarely be called.
        """
        if detection_timestamps:
            # New detections after resolution - caller should create new violation
            return StateTransitionResult(
                new_state=ViolationState.PENDING,  # Transition to new violation cycle
                should_alert=False,
                transition_reason="new_detections_after_resolution"
            )
        
        return StateTransitionResult(
            new_state=ViolationState.RESOLVED,
            should_alert=False,
            transition_reason="resolved_no_detections"
        )
    
    def count_detections_in_window(
        self,
        detection_timestamps: List[datetime],
        current_time: datetime,
        window_seconds: Optional[int] = None
    ) -> int:
        """
        Count detections within sliding window.
        
        Pure utility function for window counting.
        
        Args:
            detection_timestamps: List of detection timestamps (sorted)
            current_time: Current time
            window_seconds: Window size (default: self.window_seconds)
            
        Returns:
            Count of detections within window
        """
        window_size = window_seconds if window_seconds is not None else self.window_seconds
        window_start = current_time - timedelta(seconds=window_size)
        return len([ts for ts in detection_timestamps if ts >= window_start])
    
    def is_suppressed(
        self,
        violation: Violation,
        current_time: datetime
    ) -> bool:
        """
        Check if violation is currently in suppression period.
        
        Args:
            violation: Violation instance
            current_time: Current timestamp
            
        Returns:
            True if suppressed, False otherwise
        """
        if violation.last_alert_at is None:
            return False
        
        time_since_alert = (current_time - violation.last_alert_at).total_seconds()
        return time_since_alert < self.suppression_seconds

