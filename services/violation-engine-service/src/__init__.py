"""
Violation Engine Service

Pure logic module for violation state management.
No I/O dependencies - fully unit-testable.
"""
from .violation_model import Violation, ViolationState, ViolationType, SeverityLevel
from .violation_store import ViolationStore
from .detection_history import DetectionHistory
from .state_machine import ViolationStateMachine, StateTransitionResult
from .violation_engine import ViolationEngine, ViolationEvent, ViolationEngineResult

__all__ = [
    'Violation',
    'ViolationState',
    'ViolationType',
    'SeverityLevel',
    'ViolationStore',
    'DetectionHistory',
    'ViolationStateMachine',
    'StateTransitionResult',
    'ViolationEngine',
    'ViolationEvent',
    'ViolationEngineResult',
]

