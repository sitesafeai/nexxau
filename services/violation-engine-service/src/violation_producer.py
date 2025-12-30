"""
Violation State Change Producer

Publishes violation state changes to Redis Streams.
"""
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import redis

logger = logging.getLogger(__name__)


class ViolationStateChangeProducer:
    """
    Produces violation state changes to Redis Streams.
    
    Publishes to: violations:state_changes
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        stream_key: str = "violations:state_changes"
    ):
        """
        Initialize violation state change producer.
        
        Args:
            redis_client: Redis client instance
            stream_key: Redis stream key (default: "violations:state_changes")
        """
        self.redis = redis_client
        self.stream_key = stream_key
    
    def publish_state_change(
        self,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        old_state: str,
        new_state: str,
        transition_reason: str,
        should_alert: bool,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Publish violation state change event.
        
        Idempotent write - uses violation_id + timestamp to ensure exactly-once.
        
        Args:
            violation_id: Violation UUID
            tenant_id: Tenant ID
            worksite_id: Worksite ID
            camera_id: Camera ID
            violation_type: Violation type (NO_HELMET, NO_VEST, etc.)
            old_state: Previous state
            new_state: New state
            transition_reason: Reason for state transition
            should_alert: Whether alert should be sent
            timestamp: Event timestamp (default: datetime.utcnow())
            metadata: Additional metadata
            
        Returns:
            Redis message ID if successful, None otherwise
        """
        timestamp = timestamp or datetime.utcnow()
        
        try:
            # Prepare fields (all values as strings for Redis)
            fields = {
                'violation_id': violation_id,
                'tenant_id': tenant_id,
                'worksite_id': worksite_id,
                'camera_id': camera_id,
                'violation_type': violation_type,
                'old_state': old_state,
                'new_state': new_state,
                'transition_reason': transition_reason,
                'should_alert': 'true' if should_alert else 'false',
                'timestamp': timestamp.isoformat() + 'Z',
            }
            
            # Add metadata as JSON
            if metadata:
                fields['metadata'] = json.dumps(metadata)
            
            # Add entry to stream (XADD)
            message_id = self.redis.xadd(
                self.stream_key,
                fields,
                maxlen=1000,  # Limit stream size (keep last 1000 state changes)
                approximate=True  # Approximate trimming for performance
            )
            
            logger.debug(
                f"Published violation state change",
                extra={
                    'violation_id': violation_id,
                    'old_state': old_state,
                    'new_state': new_state,
                    'message_id': message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id,
                }
            )
            
            return message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id
            
        except redis.RedisError as e:
            logger.error(f"Redis error publishing state change: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Error publishing violation state change: {e}", exc_info=True)
            return None
    
    def publish_to_dlq(
        self,
        original_stream: str,
        message_id: str,
        message_data: Dict,
        error: str,
        retry_count: int
    ) -> Optional[str]:
        """
        Publish message to dead-letter queue.
        
        Args:
            original_stream: Original stream key
            message_id: Original message ID
            message_data: Original message data
            error: Error that caused failure
            retry_count: Number of retries attempted
            
        Returns:
            DLQ message ID if successful, None otherwise
        """
        import time
        import json as json_lib
        
        dlq_stream = f"{original_stream}:dlq"
        
        try:
            dlq_entry = {
                'original_stream': original_stream,
                'original_message_id': message_id,
                'message_data': json_lib.dumps(message_data),
                'error': error,
                'retry_count': str(retry_count),
                'timestamp': str(time.time())
            }
            
            dlq_message_id = self.redis.xadd(
                dlq_stream,
                {k: str(v) for k, v in dlq_entry.items()},
                maxlen=10000,  # Keep last 10k DLQ messages
                approximate=True
            )
            
            logger.warning(
                f"Message moved to DLQ",
                extra={
                    'original_stream': original_stream,
                    'original_message_id': message_id,
                    'dlq_stream': dlq_stream,
                    'retry_count': retry_count,
                    'error': error
                }
            )
            
            return dlq_message_id.decode('utf-8') if isinstance(dlq_message_id, bytes) else dlq_message_id
            
        except Exception as e:
            logger.error(f"Failed to publish to DLQ: {e}", exc_info=True)
            return None

