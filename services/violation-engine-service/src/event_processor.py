"""
Event Processor

Maps detection events to violation events and processes through violation engine.
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from .violation_engine import ViolationEngine, ViolationEvent, ViolationEngineResult
from .redis_consumer import DetectionEvent
from .violation_model import ViolationType, SeverityLevel

logger = logging.getLogger(__name__)


class EventProcessor:
    """
    Processes detection events and maps them to violation events.
    
    Pure logic for mapping detection objects to violation types.
    """
    
    def __init__(self, violation_engine: ViolationEngine):
        """
        Initialize event processor.
        
        Args:
            violation_engine: ViolationEngine instance
        """
        self.violation_engine = violation_engine
    
    def process_detection_event(
        self,
        detection_event: DetectionEvent,
        worksite_id: str,  # Worksite ID must be provided (not in detection event)
        current_time: Optional[datetime] = None
    ) -> List[ViolationEngineResult]:
        """
        Process a detection event and generate violation events.
        
        Maps detected objects to violation types and processes through engine.
        
        Args:
            detection_event: Detection event from Redis
            worksite_id: Worksite ID (required but not in detection event)
            current_time: Current timestamp (default: datetime.utcnow())
            
        Returns:
            List of ViolationEngineResult (one per violation type detected)
        """
        current_time = current_time or datetime.utcnow()
        results = []
        
        # Extract violation types from detected objects
        violation_types = self._extract_violation_types(detection_event.detected_objects)
        
        if not violation_types:
            logger.debug(f"No violations detected in event {detection_event.message_id}")
            return results
        
        # Process each violation type
        for violation_type, metadata in violation_types:
            violation_event = ViolationEvent(
                tenant_id=detection_event.tenant_id,
                worksite_id=worksite_id,
                camera_id=detection_event.camera_id,
                violation_type=violation_type,
                zone_id=None,  # Zone ID not in detection event - would need to be extracted if available
                timestamp=detection_event.timestamp_dt,
                metadata={
                    **metadata,
                    'detection_message_id': detection_event.message_id,
                    'model_metadata': detection_event.model_metadata,
                }
            )
            
            try:
                result = self.violation_engine.process_detection_event(
                    violation_event,
                    current_time
                )
                results.append(result)
            except Exception as e:
                logger.error(
                    f"Failed to process violation event: {e}",
                    extra={
                        'detection_message_id': detection_event.message_id,
                        'violation_type': violation_type,
                        'camera_id': detection_event.camera_id,
                    },
                    exc_info=True
                )
        
        return results
    
    def _extract_violation_types(
        self,
        detected_objects: List[Dict[str, Any]]
    ) -> List[tuple]:
        """
        Extract violation types from detected objects.
        
        Maps detected object classes to violation types.
        Example: person without helmet -> NO_HELMET
        
        Args:
            detected_objects: List of detection objects with 'class' field
            
        Returns:
            List of tuples: (violation_type, metadata)
        """
        violations = []
        
        # Get set of detected classes
        detected_classes = {obj.get('class', '').lower() for obj in detected_objects}
        
        # Check for person detections
        has_person = any(cls in ['person', 'people'] for cls in detected_classes)
        
        if not has_person:
            # No person detected - no violations possible
            return violations
        
        # Check for missing PPE
        has_helmet = any(cls in ['helmet', 'hardhat', 'hard_hat'] for cls in detected_classes)
        has_vest = any(cls in ['vest', 'safety_vest', 'safety_vest'] for cls in detected_classes)
        
        # Generate violations based on missing PPE
        # Note: This is a simplified mapping - actual logic should be more sophisticated
        # (e.g., spatial matching of person to PPE items)
        
        if not has_helmet:
            violations.append((
                ViolationType.NO_HELMET.value,
                {
                    'detected_classes': list(detected_classes),
                    'missing_ppe': 'helmet',
                }
            ))
        
        if not has_vest:
            violations.append((
                ViolationType.NO_VEST.value,
                {
                    'detected_classes': list(detected_classes),
                    'missing_ppe': 'vest',
                }
            ))
        
        # If both missing, also add generic NO_PPE
        if not has_helmet and not has_vest:
            violations.append((
                ViolationType.NO_PPE.value,
                {
                    'detected_classes': list(detected_classes),
                    'missing_ppe': ['helmet', 'vest'],
                }
            ))
        
        return violations

