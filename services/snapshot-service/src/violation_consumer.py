"""
Violation State Change Consumer

Consumes violation state changes from Redis Streams and triggers snapshot capture.
"""
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import redis

logger = logging.getLogger(__name__)


class ViolationStateChange:
    """
    Parsed violation state change event from Redis stream.
    """
    def __init__(
        self,
        message_id: str,
        violation_id: str,
        tenant_id: str,
        worksite_id: str,
        camera_id: str,
        violation_type: str,
        old_state: str,
        new_state: str,
        transition_reason: str,
        should_alert: bool,
        timestamp: str,  # ISO 8601 string
        metadata: Dict[str, Any],
        raw_message: Dict[str, bytes]
    ):
        self.message_id = message_id
        self.violation_id = violation_id
        self.tenant_id = tenant_id
        self.worksite_id = worksite_id
        self.camera_id = camera_id
        self.violation_type = violation_type
        self.old_state = old_state
        self.new_state = new_state
        self.transition_reason = transition_reason
        self.should_alert = should_alert
        self.timestamp = timestamp
        self.metadata = metadata
        self.raw_message = raw_message
        
        # Parse timestamp to datetime
        try:
            self.timestamp_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except Exception as e:
            logger.warning(f"Failed to parse timestamp {timestamp}: {e}")
            self.timestamp_dt = datetime.utcnow()
    
    def should_capture_snapshot(self) -> bool:
        """
        Determine if snapshot should be captured for this state change.
        
        Triggers on:
        - ACTIVE → ACTIVE (first detection - when state changes from PENDING to ACTIVE)
        - ACTIVE → ESCALATED
        
        Returns:
            True if snapshot should be captured, False otherwise
        """
        # ACTIVE → ACTIVE (first detection) - actually means PENDING → ACTIVE
        if self.old_state == 'PENDING' and self.new_state == 'ACTIVE':
            return True
        
        # ACTIVE → ESCALATED
        if self.old_state == 'ACTIVE' and self.new_state == 'ESCALATED':
            return True
        
        return False


class ViolationStateChangeConsumer:
    """
    Redis Streams consumer for violation state changes.
    
    Consumes from: violations:state_changes
    Consumer group: snapshot-service
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        stream_key: str = "violations:state_changes",
        consumer_group: str = "snapshot-service",
        consumer_name: str = "worker-1"
    ):
        """
        Initialize violation state change consumer.
        
        Args:
            redis_client: Redis client instance
            stream_key: Redis stream key (default: "violations:state_changes")
            consumer_group: Consumer group name (default: "snapshot-service")
            consumer_name: Consumer name for this instance (default: "worker-1")
        """
        self.redis = redis_client
        self.stream_key = stream_key
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name
        
        # Ensure consumer group exists
        self._ensure_consumer_group()
    
    def _ensure_consumer_group(self) -> None:
        """Create consumer group if it doesn't exist"""
        try:
            self.redis.xgroup_create(
                name=self.stream_key,
                groupname=self.consumer_group,
                id="0",
                mkstream=True
            )
            logger.info(f"Created consumer group {self.consumer_group} for stream {self.stream_key}")
        except redis.ResponseError as e:
            if "BUSYGROUP" in str(e):
                logger.debug(f"Consumer group {self.consumer_group} already exists")
            else:
                logger.error(f"Failed to create consumer group: {e}", exc_info=True)
                raise
    
    def read_messages(
        self,
        count: int = 10,
        block_ms: int = 1000
    ) -> List[ViolationStateChange]:
        """
        Read pending messages from stream.
        
        Args:
            count: Maximum number of messages to read (default: 10)
            block_ms: Blocking time in milliseconds (default: 1000)
            
        Returns:
            List of ViolationStateChange objects
        """
        try:
            pending_messages = self.redis.xreadgroup(
                groupname=self.consumer_group,
                consumername=self.consumer_name,
                streams={self.stream_key: "0"},  # Pending messages
                count=count,
                block=block_ms
            )
            
            events = []
            if pending_messages:
                stream_name, messages = pending_messages[0]
                for message_id, fields in messages:
                    try:
                        event = self._parse_message(message_id.decode('utf-8'), fields)
                        if event:
                            events.append(event)
                    except Exception as e:
                        logger.error(f"Failed to parse message {message_id}: {e}", exc_info=True)
                        self.acknowledge_message(message_id)
            
            return events
            
        except redis.RedisError as e:
            logger.error(f"Redis error reading messages: {e}", exc_info=True)
            return []
    
    def read_new_messages(
        self,
        count: int = 10,
        block_ms: int = 1000
    ) -> List[ViolationStateChange]:
        """
        Read new messages from stream.
        
        Args:
            count: Maximum number of messages to read (default: 10)
            block_ms: Blocking time in milliseconds (default: 1000)
            
        Returns:
            List of ViolationStateChange objects
        """
        try:
            new_messages = self.redis.xreadgroup(
                groupname=self.consumer_group,
                consumername=self.consumer_name,
                streams={self.stream_key: ">"},  # New messages
                count=count,
                block=block_ms
            )
            
            events = []
            if new_messages:
                stream_name, messages = new_messages[0]
                for message_id, fields in messages:
                    try:
                        event = self._parse_message(message_id.decode('utf-8'), fields)
                        if event:
                            events.append(event)
                    except Exception as e:
                        logger.error(f"Failed to parse message {message_id}: {e}", exc_info=True)
                        self.acknowledge_message(message_id)
            
            return events
            
        except redis.RedisError as e:
            logger.error(f"Redis error reading new messages: {e}", exc_info=True)
            return []
    
    def _parse_message(self, message_id: str, fields: Dict[bytes, bytes]) -> Optional[ViolationStateChange]:
        """Parse Redis message fields into ViolationStateChange"""
        try:
            decoded_fields = {
                k.decode('utf-8') if isinstance(k, bytes) else k: 
                v.decode('utf-8') if isinstance(v, bytes) else v
                for k, v in fields.items()
            }
            
            violation_id = decoded_fields.get('violation_id')
            tenant_id = decoded_fields.get('tenant_id')
            worksite_id = decoded_fields.get('worksite_id')
            camera_id = decoded_fields.get('camera_id')
            violation_type = decoded_fields.get('violation_type')
            old_state = decoded_fields.get('old_state')
            new_state = decoded_fields.get('new_state')
            transition_reason = decoded_fields.get('transition_reason', '')
            should_alert = decoded_fields.get('should_alert', 'false').lower() == 'true'
            timestamp = decoded_fields.get('timestamp')
            metadata_json = decoded_fields.get('metadata', '{}')
            
            if not all([violation_id, tenant_id, worksite_id, camera_id, old_state, new_state, timestamp]):
                logger.warning(f"Missing required fields in message {message_id}")
                return None
            
            try:
                metadata = json.loads(metadata_json) if metadata_json else {}
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse metadata JSON: {e}")
                metadata = {}
            
            return ViolationStateChange(
                message_id=message_id,
                violation_id=violation_id,
                tenant_id=tenant_id,
                worksite_id=worksite_id,
                camera_id=camera_id,
                violation_type=violation_type,
                old_state=old_state,
                new_state=new_state,
                transition_reason=transition_reason,
                should_alert=should_alert,
                timestamp=timestamp,
                metadata=metadata,
                raw_message=fields
            )
            
        except Exception as e:
            logger.error(f"Failed to parse message {message_id}: {e}", exc_info=True)
            return None
    
    def acknowledge_message(self, message_id: str) -> bool:
        """Acknowledge message processing"""
        try:
            self.redis.xack(
                self.stream_key,
                self.consumer_group,
                message_id.encode('utf-8') if isinstance(message_id, str) else message_id
            )
            return True
        except redis.RedisError as e:
            logger.error(f"Failed to acknowledge message {message_id}: {e}", exc_info=True)
            return False

