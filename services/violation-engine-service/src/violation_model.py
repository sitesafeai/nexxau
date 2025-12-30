"""
Violation Domain Model

Defines the core violation entity and related types for the Violation Engine service.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
import uuid


class ViolationState(Enum):
    """Violation state enumeration"""
    PENDING = "PENDING"      # Detected but not yet confirmed (within sliding window)
    ACTIVE = "ACTIVE"        # Confirmed violation (met threshold in window)
    ESCALATED = "ESCALATED"  # Persisted beyond escalation threshold
    RESOLVED = "RESOLVED"    # No longer detected (resolved)


class ViolationType(Enum):
    """Violation type enumeration"""
    NO_HELMET = "NO_HELMET"
    NO_VEST = "NO_VEST"
    NO_PPE = "NO_PPE"
    # Extensible for future violation types


class SeverityLevel(Enum):
    """Severity level enumeration"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


@dataclass
class Violation:
    """
    Violation domain model.
    
    Represents a single violation instance with full state tracking.
    
    Fields:
        violation_id: Unique identifier (UUID)
        tenant_id: Tenant identifier
        worksite_id: Worksite identifier
        camera_id: Camera identifier
        violation_type: Type of violation (NO_HELMET, NO_VEST, etc.)
        zone_id: Optional zone identifier (null if not zone-specific)
        state: Current state (PENDING, ACTIVE, ESCALATED, RESOLVED)
        first_seen_at: Timestamp when violation was first detected
        last_seen_at: Timestamp of most recent detection
        last_alert_at: Timestamp of last alert sent (null if never alerted)
        severity_level: Severity level (LOW, MEDIUM, HIGH)
        metadata: Additional metadata (JSON)
    """
    violation_id: str
    tenant_id: str
    worksite_id: str
    camera_id: str
    violation_type: str  # ViolationType enum value as string
    zone_id: Optional[str]
    state: ViolationState
    first_seen_at: datetime
    last_seen_at: datetime
    last_alert_at: Optional[datetime]
    severity_level: SeverityLevel
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def create(
        cls,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        zone_id: Optional[str],
        severity_level: SeverityLevel = SeverityLevel.MEDIUM,
        metadata: Optional[Dict[str, Any]] = None
    ) -> "Violation":
        """
        Factory method to create a new violation in PENDING state.
        
        Args:
            tenant_id: Tenant identifier
            worksite_id: Worksite identifier
            camera_id: Camera identifier
            violation_type: Violation type (enum value as string)
            zone_id: Optional zone identifier
            severity_level: Severity level (default: MEDIUM)
            metadata: Optional metadata dictionary
            
        Returns:
            New Violation instance in PENDING state
        """
        now = datetime.utcnow()
        return cls(
            violation_id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            worksite_id=worksite_id,
            camera_id=camera_id,
            violation_type=violation_type,
            zone_id=zone_id,
            state=ViolationState.PENDING,
            first_seen_at=now,
            last_seen_at=now,
            last_alert_at=None,
            severity_level=severity_level,
            metadata=metadata or {}
        )
    
    def get_dedup_key(self) -> str:
        """
        Generate deduplication key for this violation.
        
        Format: {camera_id}:{violation_type}:{zone_id or 'none'}
        
        Returns:
            Deduplication key string
        """
        zone_key = self.zone_id if self.zone_id is not None else "none"
        return f"{self.camera_id}:{self.violation_type}:{zone_key}"
    
    def update_last_seen(self, timestamp: datetime) -> None:
        """Update last_seen_at timestamp"""
        self.last_seen_at = timestamp
    
    def mark_alerted(self, timestamp: datetime) -> None:
        """Mark violation as alerted at given timestamp"""
        self.last_alert_at = timestamp

