"""
Acknowledgement Model

Domain model for violation acknowledgements.
"""
from enum import Enum
from datetime import datetime
from typing import Optional


class AcknowledgementMethod(str, Enum):
    """Methods for acknowledging violations"""
    WEB = "web"
    EMAIL_LINK = "email_link"
    SMS = "sms"


class Acknowledgement:
    """Acknowledgement domain model"""
    
    def __init__(
        self,
        id: str,
        violation_id: str,
        tenant_id: str,
        user_id: str,
        acknowledged_at: datetime,
        method: AcknowledgementMethod,
        note: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.violation_id = violation_id
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.acknowledged_at = acknowledged_at
        self.method = method
        self.note = note
        self.created_at = created_at or acknowledged_at

