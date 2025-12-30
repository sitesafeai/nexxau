"""
Shared types for Nexxau microservices (Python)

These types mirror the TypeScript definitions for type safety
in inter-service communication.
"""
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List


class UserRole(str, Enum):
    """User role enumeration"""
    SUPER_ADMIN = "SUPER_ADMIN"
    COMPANY_ADMIN = "COMPANY_ADMIN"
    SITE_MANAGER = "SITE_MANAGER"
    VIEWER = "VIEWER"


class DetectionType(str, Enum):
    """Detection type enumeration"""
    PERSON = "PERSON"
    PERSON_WITH_HARDHAT = "PERSON_WITH_HARDHAT"
    PERSON_WITHOUT_HARDHAT = "PERSON_WITHOUT_HARDHAT"
    PERSON_WITH_SAFETY_VEST = "PERSON_WITH_SAFETY_VEST"
    PERSON_WITHOUT_SAFETY_VEST = "PERSON_WITHOUT_SAFETY_VEST"
    SAFETY_VIOLATION = "SAFETY_VIOLATION"
    EQUIPMENT = "EQUIPMENT"
    VEHICLE = "VEHICLE"


class AlertSeverity(str, Enum):
    """Alert severity enumeration"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class Tenant:
    """Tenant/Customer identification"""
    id: str
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime


@dataclass
class User:
    """User identification"""
    id: str
    tenant_id: str
    email: str
    name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime


@dataclass
class Camera:
    """Camera/Site identification"""
    id: str
    tenant_id: str
    site_id: Optional[str]
    name: str
    stream_url: str
    location: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


@dataclass
class Site:
    """Site identification"""
    id: str
    tenant_id: str
    name: str
    address: Optional[str]
    created_at: datetime
    updated_at: datetime


@dataclass
class BoundingBox:
    """Bounding box coordinates"""
    x: float
    y: float
    width: float
    height: float


@dataclass
class Detection:
    """Single detection result"""
    id: str
    type: DetectionType
    confidence: float
    bbox: BoundingBox
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class DetectionResult:
    """Detection result from ML service"""
    id: str
    camera_id: str
    tenant_id: str
    timestamp: datetime
    detections: List[Detection]
    frame_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class Alert:
    """Alert/Notification"""
    id: str
    tenant_id: str
    camera_id: str
    detection_id: str
    severity: AlertSeverity
    type: str
    message: str
    is_acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    created_at: datetime = None


@dataclass
class RequestContext:
    """Request context (passed between services)"""
    request_id: str
    correlation_id: Optional[str] = None
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    user_role: Optional[UserRole] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


@dataclass
class HealthCheck:
    """Health check response"""
    status: str  # 'healthy' | 'degraded' | 'unhealthy'
    service: str
    version: str
    timestamp: datetime
    checks: Optional[Dict[str, Dict[str, Any]]] = None
