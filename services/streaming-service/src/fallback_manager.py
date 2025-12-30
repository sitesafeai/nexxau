"""
Fallback Manager

Manages fallback behavior when streaming fails or protocol is unavailable.
"""
import logging
from typing import Optional
from .streaming_config import StreamingProtocol

logger = logging.getLogger(__name__)


class FallbackManager:
    """
    Manages fallback behavior for streaming.
    
    Fallback strategies:
    1. WebRTC → LL-HLS: If WebRTC fails, fall back to LL-HLS
    2. LL-HLS → Static snapshot: If LL-HLS fails, fall back to static snapshot
    3. Protocol unavailable: Use alternative protocol
    """
    
    def __init__(self, enable_fallback: bool = True):
        """
        Initialize fallback manager.
        
        Args:
            enable_fallback: Enable fallback behavior (default: True)
        """
        self.enable_fallback = enable_fallback
        self._fallback_history: dict = {}
    
    def get_fallback_protocol(
        self,
        primary_protocol: StreamingProtocol,
        camera_count: int
    ) -> Optional[StreamingProtocol]:
        """
        Get fallback protocol if primary protocol fails.
        
        Args:
            primary_protocol: Primary protocol that failed
            camera_count: Number of cameras at site
            
        Returns:
            Fallback protocol or None if no fallback available
        """
        if not self.enable_fallback:
            return None
        
        # WebRTC → LL-HLS fallback
        if primary_protocol == StreamingProtocol.WEBRTC:
            logger.info("Falling back from WebRTC to LL-HLS")
            return StreamingProtocol.LL_HLS
        
        # LL-HLS → Static snapshot (no protocol, just return None)
        # In practice, would serve static snapshot endpoint
        if primary_protocol == StreamingProtocol.LL_HLS:
            logger.warning("LL-HLS failed, no protocol fallback available (use static snapshot)")
            return None
        
        return None
    
    def should_try_fallback(
        self,
        camera_id: str,
        protocol: StreamingProtocol
    ) -> bool:
        """
        Check if fallback should be attempted.
        
        Prevents infinite fallback loops by tracking attempts.
        
        Args:
            camera_id: Camera identifier
            protocol: Protocol that failed
            
        Returns:
            True if fallback should be attempted, False otherwise
        """
        if not self.enable_fallback:
            return False
        
        key = f"{camera_id}:{protocol.value}"
        
        # Allow fallback if not attempted recently
        if key not in self._fallback_history:
            self._fallback_history[key] = 1
            return True
        
        # Limit fallback attempts (max 3)
        if self._fallback_history[key] >= 3:
            logger.warning(
                f"Max fallback attempts reached for {key}",
                extra={'camera_id': camera_id, 'protocol': protocol.value}
            )
            return False
        
        self._fallback_history[key] += 1
        return True
    
    def record_fallback_attempt(
        self,
        camera_id: str,
        primary_protocol: StreamingProtocol,
        fallback_protocol: Optional[StreamingProtocol],
        success: bool
    ) -> None:
        """
        Record fallback attempt result.
        
        Args:
            camera_id: Camera identifier
            primary_protocol: Primary protocol that failed
            fallback_protocol: Fallback protocol attempted
            success: Whether fallback was successful
        """
        key = f"{camera_id}:{primary_protocol.value}"
        
        if success:
            # Clear fallback history on success
            if key in self._fallback_history:
                del self._fallback_history[key]
            
            logger.info(
                f"Fallback successful",
                extra={
                    'camera_id': camera_id,
                    'primary_protocol': primary_protocol.value,
                    'fallback_protocol': fallback_protocol.value if fallback_protocol else None,
                }
            )
        else:
            logger.warning(
                f"Fallback failed",
                extra={
                    'camera_id': camera_id,
                    'primary_protocol': primary_protocol.value,
                    'fallback_protocol': fallback_protocol.value if fallback_protocol else None,
                }
            )

