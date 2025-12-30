"""
Acknowledgement Service

Main service for handling acknowledgements via multiple methods.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import hashlib
import hmac

from .acknowledgement_model import Acknowledgement, AcknowledgementMethod
from .acknowledgement_repository import AcknowledgementRepository
from .state_manager import StateManager

logger = logging.getLogger(__name__)


class AcknowledgementService:
    """
    Service for handling acknowledgements.
    
    Supports:
    - Web acknowledgement (via API)
    - Email link acknowledgement
    - SMS acknowledgement
    """
    
    def __init__(
        self,
        acknowledgement_repository: AcknowledgementRepository,
        state_manager: StateManager,
        token_secret: str
    ):
        """
        Initialize acknowledgement service.
        
        Args:
            acknowledgement_repository: AcknowledgementRepository instance
            state_manager: StateManager instance
            token_secret: Secret key for generating secure tokens
        """
        self.repository = acknowledgement_repository
        self.state_manager = state_manager
        self.token_secret = token_secret
    
    def acknowledge_violation_web(
        self,
        violation_id: str,
        tenant_id: str,
        user_id: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Acknowledge violation via web interface.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            user_id: User identifier
            note: Optional acknowledgement note
            
        Returns:
            Dict with acknowledgement result
        """
        return self._create_acknowledgement(
            violation_id=violation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            method=AcknowledgementMethod.WEB,
            note=note
        )
    
    def acknowledge_violation_email_link(
        self,
        token: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Acknowledge violation via email link.
        
        Args:
            token: Secure token from email link
            note: Optional acknowledgement note
            
        Returns:
            Dict with acknowledgement result
        """
        # Decode token to get violation and user info
        token_data = self._decode_token(token)
        if not token_data:
            return {
                'success': False,
                'error': 'invalid_token'
            }
        
        return self._create_acknowledgement(
            violation_id=token_data['violation_id'],
            tenant_id=token_data['tenant_id'],
            user_id=token_data['user_id'],
            method=AcknowledgementMethod.EMAIL_LINK,
            note=note
        )
    
    def acknowledge_violation_sms(
        self,
        violation_id: str,
        tenant_id: str,
        user_phone: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Acknowledge violation via SMS reply.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            user_phone: User phone number (maps to user_id)
            note: Optional acknowledgement note (from SMS body)
            
        Returns:
            Dict with acknowledgement result
        """
        # TODO: Map user_phone to user_id via database lookup
        # For now, assume user_id can be derived from phone
        user_id = f"phone:{user_phone}"  # Placeholder
        
        return self._create_acknowledgement(
            violation_id=violation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            method=AcknowledgementMethod.SMS,
            note=note
        )
    
    def generate_email_acknowledgement_link(
        self,
        violation_id: str,
        tenant_id: str,
        user_id: str,
        base_url: str = "https://app.nexxau.com"
    ) -> str:
        """
        Generate secure acknowledgement link for email.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            user_id: User identifier
            base_url: Base URL for acknowledgement endpoint
            
        Returns:
            Secure acknowledgement URL
        """
        token = self._generate_token(violation_id, tenant_id, user_id)
        return f"{base_url}/acknowledge?token={token}"
    
    def _create_acknowledgement(
        self,
        violation_id: str,
        tenant_id: str,
        user_id: str,
        method: AcknowledgementMethod,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create acknowledgement record.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            user_id: User identifier
            method: Acknowledgement method
            note: Optional note
            
        Returns:
            Dict with acknowledgement result
        """
        try:
            # Check if already acknowledged
            existing = self.repository.has_acknowledgement(violation_id)
            if existing:
                logger.info(
                    f"Violation already acknowledged",
                    extra={'violation_id': violation_id, 'user_id': user_id}
                )
                return {
                    'success': True,
                    'already_acknowledged': True,
                    'violation_id': violation_id
                }
            
            # Create acknowledgement
            ack_id = self.repository.create_acknowledgement(
                violation_id=violation_id,
                tenant_id=tenant_id,
                user_id=user_id,
                method=method,
                note=note
            )
            
            if not ack_id:
                return {
                    'success': False,
                    'error': 'failed_to_create_acknowledgement'
                }
            
            logger.info(
                f"Acknowledgement created",
                extra={
                    'acknowledgement_id': ack_id,
                    'violation_id': violation_id,
                    'user_id': user_id,
                    'method': method.value,
                }
            )
            
            return {
                'success': True,
                'acknowledgement_id': ack_id,
                'violation_id': violation_id,
                'method': method.value,
                'acknowledged_at': datetime.utcnow().isoformat() + 'Z'
            }
            
        except Exception as e:
            logger.error(
                f"Error creating acknowledgement: {e}",
                extra={'violation_id': violation_id},
                exc_info=True
            )
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_token(
        self,
        violation_id: str,
        tenant_id: str,
        user_id: str
    ) -> str:
        """
        Generate secure token for email/SMS acknowledgement.
        
        Args:
            violation_id: Violation identifier
            tenant_id: Tenant identifier
            user_id: User identifier
            
        Returns:
            Secure token string
        """
        # Create token payload
        payload = f"{violation_id}:{tenant_id}:{user_id}"
        
        # Generate HMAC signature
        signature = hmac.new(
            self.token_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Combine payload and signature
        token = f"{payload}:{signature}"
        
        # Base64 encode for URL safety
        import base64
        token_bytes = token.encode('utf-8')
        token_b64 = base64.urlsafe_b64encode(token_bytes).decode('utf-8')
        
        return token_b64
    
    def _decode_token(self, token: str) -> Optional[Dict[str, str]]:
        """
        Decode secure token.
        
        Args:
            token: Secure token string
            
        Returns:
            Dict with violation_id, tenant_id, user_id if valid, None otherwise
        """
        try:
            import base64
            token_bytes = base64.urlsafe_b64decode(token.encode('utf-8'))
            token_str = token_bytes.decode('utf-8')
            
            parts = token_str.split(':')
            if len(parts) != 4:
                return None
            
            violation_id, tenant_id, user_id, signature = parts
            
            # Verify signature
            payload = f"{violation_id}:{tenant_id}:{user_id}"
            expected_signature = hmac.new(
                self.token_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.warning("Invalid token signature")
                return None
            
            return {
                'violation_id': violation_id,
                'tenant_id': tenant_id,
                'user_id': user_id
            }
            
        except Exception as e:
            logger.warning(f"Failed to decode token: {e}")
            return None

