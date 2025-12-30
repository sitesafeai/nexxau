"""
Redis Consumer for Detection Events

Consumes raw detection events from Redis Streams with exactly-once semantics.
"""
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import redis

logger = logging.getLogger(__name__)


class DetectionEvent:
    """
    Parsed detection event from Redis stream.
    
    Represents a raw detection event that may trigger violations.
    """
    def __init__(
        self,
        message_id: str,
        camera_id: str,
        tenant_id: str,
        timestamp: str,  # ISO 8601 string
        detected_objects: List[Dict[str, Any]],  # List of detection objects
        model_metadata: Dict[str, str],  # Model metadata
        raw_message: Dict[str, bytes]  # Raw Redis message for debugging
    ):
        self.message_id = message_id
        self.camera_id = camera_id
        self.tenant_id = tenant_id
        self.timestamp = timestamp
        self.detected_objects = detected_objects
        self.model_metadata = model_metadata
        self.raw_message = raw_message
        
        # Parse timestamp to datetime
        try:
            self.timestamp_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except Exception as e:
            logger.warning(f"Failed to parse timestamp {timestamp}: {e}")
            self.timestamp_dt = datetime.utcnow()


class DetectionConsumer:
    """
    Redis Streams consumer for detection events.
    
    Consumes from: detections:raw
    Consumer group: violation-engine
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        stream_key: str = "detections:raw",
        consumer_group: str = "violation-engine",
        consumer_name: str = "worker-1",
        stream_pattern: Optional[str] = None
    ):
        """
        Initialize detection consumer.
        
        Args:
            redis_client: Redis client instance
            stream_key: Redis stream key (default: "detections:raw")
                        Can also be a pattern like "detections:tenant:*:camera:*" for multi-stream reading
            consumer_group: Consumer group name (default: "violation-engine")
            consumer_name: Consumer name for this instance (default: "worker-1")
            stream_pattern: Optional pattern for discovering streams (e.g., "detections:tenant:*")
        """
        self.redis = redis_client
        self.stream_key = stream_key
        self.stream_pattern = stream_pattern
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name
        
        # Ensure consumer group exists (for single stream mode)
        if not stream_pattern:
            self._ensure_consumer_group()
    
    def _ensure_consumer_group(self) -> None:
        """Create consumer group if it doesn't exist"""
        try:
            # Try to create consumer group starting from '0' (beginning)
            # If group already exists, this will raise an error which we ignore
            self.redis.xgroup_create(
                name=self.stream_key,
                groupname=self.consumer_group,
                id="0",
                mkstream=True  # Create stream if it doesn't exist
            )
            logger.info(f"Created consumer group {self.consumer_group} for stream {self.stream_key}")
        except redis.ResponseError as e:
            if "BUSYGROUP" in str(e):
                # Group already exists - this is fine
                logger.debug(f"Consumer group {self.consumer_group} already exists")
            else:
                logger.error(f"Failed to create consumer group: {e}", exc_info=True)
                raise
    
    def read_messages(
        self,
        count: int = 10,
        block_ms: int = 1000
    ) -> List[DetectionEvent]:
        """
        Read pending messages from stream.
        
        Uses XREADGROUP to read messages for this consumer.
        Pending messages are messages that were delivered but not acknowledged.
        
        Args:
            count: Maximum number of messages to read (default: 10)
            block_ms: Blocking time in milliseconds (default: 1000)
            
        Returns:
            List of DetectionEvent objects
        """
        try:
            # Read from consumer group
            # First try to read pending messages (messages delivered but not ACKed)
            pending_messages = self.redis.xreadgroup(
                groupname=self.consumer_group,
                consumername=self.consumer_name,
                streams={self.stream_key: "0"},  # "0" means pending messages
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
                        logger.error(
                            f"Failed to parse message {message_id}: {e}",
                            exc_info=True
                        )
                        # Acknowledge poison message to prevent infinite retry
                        self.acknowledge_message(message_id)
            
            return events
            
        except redis.RedisError as e:
            logger.error(f"Redis error reading messages: {e}", exc_info=True)
            return []
    
    def read_new_messages(
        self,
        count: int = 10,
        block_ms: int = 1000
    ) -> List[DetectionEvent]:
        """
        Read new messages from stream (not yet delivered to any consumer).
        
        Args:
            count: Maximum number of messages to read (default: 10)
            block_ms: Blocking time in milliseconds (default: 1000)
            
        Returns:
            List of DetectionEvent objects
        """
        try:
            # Read new messages using ">" which means "messages never delivered"
            new_messages = self.redis.xreadgroup(
                groupname=self.consumer_group,
                consumername=self.consumer_name,
                streams={self.stream_key: ">"},  # ">" means new messages
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
                        logger.error(
                            f"Failed to parse message {message_id}: {e}",
                            exc_info=True
                        )
                        # Acknowledge poison message to prevent infinite retry
                        self.acknowledge_message(message_id)
            
            return events
            
        except redis.RedisError as e:
            logger.error(f"Redis error reading new messages: {e}", exc_info=True)
            return []
    
    def _parse_message(self, message_id: str, fields: Dict[bytes, bytes]) -> Optional[DetectionEvent]:
        """
        Parse Redis message fields into DetectionEvent.
        
        Expected fields:
        - cameraId: Camera ID
        - tenantId: Tenant ID
        - timestamp: ISO 8601 timestamp
        - detections: JSON string of detected objects
        - model: JSON string of model metadata
        
        Args:
            message_id: Redis message ID
            fields: Message fields dictionary
            
        Returns:
            DetectionEvent or None if parsing fails
        """
        try:
            # Decode fields
            decoded_fields = {
                k.decode('utf-8') if isinstance(k, bytes) else k: 
                v.decode('utf-8') if isinstance(v, bytes) else v
                for k, v in fields.items()
            }
            
            camera_id = decoded_fields.get('cameraId')
            tenant_id = decoded_fields.get('tenantId')
            timestamp = decoded_fields.get('timestamp')
            detections_json = decoded_fields.get('detections', '[]')
            model_json = decoded_fields.get('model', '{}')
            
            if not camera_id or not tenant_id or not timestamp:
                logger.warning(f"Missing required fields in message {message_id}")
                return None
            
            # Parse JSON fields
            try:
                detected_objects = json.loads(detections_json) if detections_json else []
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse detections JSON: {e}")
                detected_objects = []
            
            try:
                model_metadata = json.loads(model_json) if model_json else {}
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse model JSON: {e}")
                model_metadata = {}
            
            return DetectionEvent(
                message_id=message_id,
                camera_id=camera_id,
                tenant_id=tenant_id,
                timestamp=timestamp,
                detected_objects=detected_objects,
                model_metadata=model_metadata,
                raw_message=fields
            )
            
        except Exception as e:
            logger.error(f"Failed to parse message {message_id}: {e}", exc_info=True)
            return None
    
    def acknowledge_message(self, message_id: str) -> bool:
        """
        Acknowledge message processing.
        
        Args:
            message_id: Redis message ID to acknowledge
            
        Returns:
            True if acknowledged, False otherwise
        """
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
    
    def acknowledge_messages(self, message_ids: List[str]) -> int:
        """
        Acknowledge multiple messages.
        
        Args:
            message_ids: List of message IDs to acknowledge
            
        Returns:
            Number of messages acknowledged
        """
        if not message_ids:
            return 0
        
        try:
            # Convert to bytes if needed
            ids_bytes = [
                mid.encode('utf-8') if isinstance(mid, str) else mid
                for mid in message_ids
            ]
            
            acknowledged = self.redis.xack(
                self.stream_key,
                self.consumer_group,
                *ids_bytes
            )
            return acknowledged
        except redis.RedisError as e:
            logger.error(f"Failed to acknowledge messages: {e}", exc_info=True)
            return 0
    
    def get_retry_count(self, message_id: str) -> int:
        """Get retry count for message"""
        try:
            retry_key = f"retry:violation:{message_id}"
            count = self.redis.get(retry_key)
            return int(count) if count else 0
        except Exception:
            return 0
    
    def increment_retry_count(self, message_id: str, max_retries: int = 3) -> int:
        """Increment retry count, return new count"""
        try:
            retry_key = f"retry:violation:{message_id}"
            count = self.redis.incr(retry_key)
            self.redis.expire(retry_key, 3600)  # Expire after 1 hour
            return count
        except Exception:
            return 0
    
    def clear_retry_count(self, message_id: str) -> None:
        """Clear retry count on success"""
        try:
            retry_key = f"retry:violation:{message_id}"
            self.redis.delete(retry_key)
        except Exception:
            pass

