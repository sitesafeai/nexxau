"""
Violation Engine

Main orchestrator for violation state management.

Consumes raw detection events and manages violation lifecycle.
Pure logic functions - no I/O dependencies.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from .violation_model import Violation, ViolationState, ViolationType, SeverityLevel
from .violation_store import ViolationStore
from .detection_history import DetectionHistory
from .state_machine import ViolationStateMachine, StateTransitionResult


class ViolationEvent:
    """
    Detection event input to violation engine.
    
    Represents a raw detection event that may trigger or update a violation.
    """
    def __init__(
        self,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        zone_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.tenant_id = tenant_id
        self.worksite_id = worksite_id
        self.camera_id = camera_id
        self.violation_type = violation_type
        self.zone_id = zone_id
        self.timestamp = timestamp or datetime.utcnow()
        self.metadata = metadata or {}
    
    def get_dedup_key(self) -> str:
        """Generate deduplication key for this event"""
        zone_key = self.zone_id if self.zone_id is not None else "none"
        return f"{self.camera_id}:{self.violation_type}:{zone_key}"


class ViolationEngineResult:
    """Result of processing a violation event"""
    
    def __init__(
        self,
        violation: Optional[Violation],
        state_changed: bool,
        should_alert: bool,
        transition_reason: str,
        old_state: Optional[ViolationState] = None
    ):
        self.violation = violation
        self.state_changed = state_changed
        self.should_alert = should_alert
        self.transition_reason = transition_reason
        self.old_state = old_state  # Previous state before transition


class ViolationEngine:
    """
    Violation Engine orchestrator.
    
    Processes detection events and manages violation state transitions.
    All logic is pure and unit-testable (no I/O).
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
        Initialize violation engine.
        
        Args:
            window_seconds: Sliding window size (default: 10)
            detection_threshold: Minimum detections to trigger ACTIVE (default: 3)
            escalation_seconds: Seconds before escalation (default: 120)
            resolution_seconds: Seconds without detection before resolution (default: 30)
            suppression_seconds: Alert suppression cooldown (default: 60)
        """
        self.store = ViolationStore()
        self.history = DetectionHistory()
        self.state_machine = ViolationStateMachine(
            window_seconds=window_seconds,
            detection_threshold=detection_threshold,
            escalation_seconds=escalation_seconds,
            resolution_seconds=resolution_seconds,
            suppression_seconds=suppression_seconds
        )
    
    def process_detection_event(
        self,
        event: ViolationEvent,
        current_time: Optional[datetime] = None
    ) -> ViolationEngineResult:
        """
        Process a detection event and update violation state.
        
        Main entry point for violation processing.
        Pure function - deterministic, no I/O.
        
        Args:
            event: Detection event to process
            current_time: Current timestamp (default: datetime.utcnow())
            
        Returns:
            ViolationEngineResult with updated violation and state change info
        """
        current_time = current_time or datetime.utcnow()
        dedup_key = event.get_dedup_key()
        
        # Add detection to history
        self.history.add_detection(dedup_key, event.timestamp)
        
        # Get or create violation
        violation = self.store.get_violation_by_key(dedup_key)
        
        if violation is None:
            # Create new violation in PENDING state
            violation = Violation.create(
                tenant_id=event.tenant_id,
                worksite_id=event.worksite_id,
                camera_id=event.camera_id,
                violation_type=event.violation_type,
                zone_id=event.zone_id,
                severity_level=self._determine_severity(event),
                metadata=event.metadata
            )
            self.store.upsert_violation(violation)
        
        # Get detection history for this violation
        detection_timestamps = self.history.get_detections(dedup_key)
        
        # Evaluate state transition
        old_state = violation.state
        transition_result = self.state_machine.evaluate_state_transition(
            violation,
            detection_timestamps,
            current_time
        )
        
        # Update violation state
        violation.state = transition_result.new_state
        
        # Handle alert marking
        if transition_result.should_alert:
            violation.mark_alerted(current_time)
        
        # Store updated violation
        self.store.upsert_violation(violation)
        
        # Check if state changed
        state_changed = old_state != violation.state
        
        return ViolationEngineResult(
            violation=violation,
            state_changed=state_changed,
            should_alert=transition_result.should_alert,
            transition_reason=transition_result.transition_reason,
            old_state=old_state
        )
    
    def evaluate_resolutions(
        self,
        current_time: Optional[datetime] = None
    ) -> List[ViolationEngineResult]:
        """
        Evaluate all active violations for resolution.
        
        Checks if violations should transition to RESOLVED based on
        lack of recent detections.
        
        Args:
            current_time: Current timestamp (default: datetime.utcnow())
            
        Returns:
            List of ViolationEngineResult for violations that changed state
        """
        current_time = current_time or datetime.utcnow()
        results = []
        
        # Get all active violations (ACTIVE or ESCALATED)
        active_violations = self.store.get_active_violations()
        
        for violation in active_violations:
            dedup_key = violation.get_dedup_key()
            detection_timestamps = self.history.get_detections(dedup_key)
            
            # Evaluate state transition
            old_state = violation.state
            transition_result = self.state_machine.evaluate_state_transition(
                violation,
                detection_timestamps,
                current_time
            )
            
            # Update if state changed
            if transition_result.new_state != old_state:
                violation.state = transition_result.new_state
                self.store.upsert_violation(violation)
                
                old_state = violation.state
                results.append(ViolationEngineResult(
                    violation=violation,
                    state_changed=True,
                    should_alert=transition_result.should_alert,
                    transition_reason=transition_result.transition_reason,
                    old_state=old_state
                ))
        
        return results
    
    def cleanup_resolved_violations(
        self,
        max_age_seconds: int = 3600
    ) -> int:
        """
        Clean up old resolved violations and their detection history.
        
        Removes resolved violations older than max_age_seconds and
        cleans up their detection history.
        
        Args:
            max_age_seconds: Maximum age of resolved violations to keep (default: 3600)
            
        Returns:
            Number of violations cleaned up
        """
        from datetime import timedelta
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(seconds=max_age_seconds)
        
        resolved_violations = self.store.get_violations_by_state(ViolationState.RESOLVED)
        cleaned_count = 0
        
        for violation in resolved_violations:
            # Check if violation is old enough to clean up
            if violation.last_seen_at < cutoff_time:
                dedup_key = violation.get_dedup_key()
                self.store.remove_violation(violation)
                self.history.clear_detections(dedup_key)
                cleaned_count += 1
        
        return cleaned_count
    
    def _determine_severity(self, event: ViolationEvent) -> SeverityLevel:
        """
        Determine severity level for a violation event.
        
        Default implementation returns MEDIUM.
        Can be customized based on violation_type or metadata.
        
        Args:
            event: Detection event
            
        Returns:
            SeverityLevel enum value
        """
        # Default severity
        return SeverityLevel.MEDIUM
        
        # Example: Custom severity based on violation type
        # if event.violation_type == ViolationType.NO_HELMET.value:
        #     return SeverityLevel.HIGH
        # elif event.violation_type == ViolationType.NO_VEST.value:
        #     return SeverityLevel.MEDIUM
        # else:
        #     return SeverityLevel.LOW

