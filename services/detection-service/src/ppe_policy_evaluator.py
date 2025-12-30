"""
PPE Policy Evaluator - Service Stub
====================================

This module defines the interface for a separate PPE Policy service that evaluates
raw detections against site-specific PPE requirements.

ARCHITECTURE:
- Detection Service: Outputs raw detections (objects, bboxes, confidence) - rule-agnostic
- PPE Policy Service: Consumes raw detections, applies business rules, outputs violations

SEPARATION OF CONCERNS:
- Detection Service: ML inference only, no business logic
- PPE Policy Service: Business rules, compliance evaluation, tenant/worksite-specific policies

This is a stub interface definition. The actual PPE Policy service should be
implemented as a separate microservice that:
1. Consumes detection results from Redis Streams (detections:tenant:*:camera:*)
2. Loads PPE rules per tenant/worksite from database or configuration
3. Evaluates detections against rules
4. Publishes violations to appropriate streams/channels
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawDetection:
    """Raw detection output from Detection Service (rule-agnostic)"""
    class_name: str  # e.g., "person", "helmet", "vest"
    confidence: float  # Confidence score (0.0-1.0)
    bbox: List[float]  # [x1, y1, x2, y2] bounding box coordinates
    

@dataclass
class DetectionResult:
    """
    Detection result message format from Detection Service.
    
    This is the contract that Detection Service publishes to Redis Streams.
    The PPE Policy service consumes this format.
    """
    camera_id: str
    tenant_id: str
    timestamp: str  # ISO 8601 format
    sequence: int
    people_count: int  # Raw count of person detections (statistical only)
    detections: List[RawDetection]  # Raw object detections
    inference_latency_ms: float
    model: Dict[str, str]  # Model metadata (name, version, sha, device)


@dataclass
class PPERule:
    """
    PPE rule definition (example structure - actual implementation may vary).
    
    Rules are tenant/worksite-specific and configurable.
    """
    rule_id: str
    tenant_id: str
    worksite_id: Optional[str]  # None = applies to all worksites for tenant
    required_ppe: List[str]  # e.g., ["helmet", "vest"]
    enforcement_level: str  # e.g., "warning", "violation", "critical"
    enabled: bool


@dataclass
class PPEViolation:
    """
    PPE violation output from Policy Evaluator.
    
    Published to violations stream or alerts service.
    """
    violation_id: str
    tenant_id: str
    worksite_id: str
    camera_id: str
    timestamp: str
    violation_type: str  # e.g., "missing_helmet", "missing_vest"
    severity: str  # e.g., "warning", "violation", "critical"
    person_bbox: List[float]  # Bounding box of person with violation
    detection_sequence: int  # Reference to original detection
    rule_id: str  # Which rule was violated


class PPEPolicyEvaluator:
    """
    PPE Policy Evaluator Interface (Stub).
    
    This is the contract definition for the PPE Policy service.
    Actual implementation should be a separate microservice.
    
    RESPONSIBILITIES:
    - Load PPE rules per tenant/worksite from configuration/database
    - Evaluate raw detections against rules
    - Generate violations when rules are breached
    - Publish violations to appropriate channels
    
    CONFIGURATION:
    - Rules must be configurable per tenant/worksite
    - No hardcoded PPE assumptions
    - Support for future regulatory changes
    """
    
    def evaluate_detection(
        self,
        detection_result: DetectionResult,
        ppe_rules: List[PPERule]
    ) -> List[PPEViolation]:
        """
        Evaluate raw detection result against PPE rules.
        
        Args:
            detection_result: Raw detection output from Detection Service
            ppe_rules: List of applicable PPE rules for tenant/worksite
            
        Returns:
            List of violations (empty if no violations)
        """
        violations = []
        
        # TODO: Implement rule evaluation logic
        # This should:
        # 1. Match person detections to nearby PPE detections (spatial matching)
        # 2. Check if required PPE items are present for each person
        # 3. Generate violations for missing or improperly worn PPE
        # 4. Apply severity based on rule configuration
        
        return violations
    
    def load_rules_for_tenant(
        self,
        tenant_id: str,
        worksite_id: Optional[str] = None
    ) -> List[PPERule]:
        """
        Load PPE rules for a tenant/worksite.
        
        Args:
            tenant_id: Tenant ID
            worksite_id: Optional worksite ID (None = tenant-wide rules)
            
        Returns:
            List of applicable PPE rules
        """
        # TODO: Load from database or configuration service
        # Rules should be tenant/worksite-specific and configurable
        return []
    
    def publish_violation(self, violation: PPEViolation) -> bool:
        """
        Publish violation to appropriate channel (Redis Stream, alerts service, etc.).
        
        Args:
            violation: PPE violation to publish
            
        Returns:
            True if published successfully, False otherwise
        """
        # TODO: Publish to violations stream or alerts service
        # Stream: violations:tenant:{tenantId}:worksite:{worksiteId}
        # Or integrate with alerts/notifications service
        return False


# Example usage flow (for documentation):
"""
1. Detection Service publishes raw detection to:
   detections:tenant:{tenantId}:camera:{cameraId}
   
2. PPE Policy Service consumes detection and:
   - Loads applicable rules for tenant/worksite
   - Evaluates detection against rules
   - Generates violations if rules breached
   
3. PPE Policy Service publishes violations to:
   violations:tenant:{tenantId}:worksite:{worksiteId}
   
4. Alerts/Notifications service consumes violations and:
   - Sends notifications
   - Creates incidents
   - Triggers workflows
"""

