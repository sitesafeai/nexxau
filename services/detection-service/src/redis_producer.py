"""
Redis Streams Producer for detection results
"""
import logging
import redis
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class DetectionProducer:
    """Produces detection results to Redis Streams"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_prefix = 'detections:tenant:'
    
    def publish_detection(
        self,
        tenant_id: str,
        camera_id: str,
        detection_result: Dict
    ) -> Optional[str]:
        """
        Publish detection result to Redis stream
        
        Stream key: detections:tenant:{tenantId}:camera:{cameraId}
        
        Args:
            tenant_id: Tenant ID
            camera_id: Camera ID
            detection_result: Detection result dictionary
            
        Returns:
            Message ID if successful, None otherwise
        """
        stream_key = f"{self.stream_prefix}{tenant_id}:camera:{camera_id}"
        
        try:
            # Prepare fields (all values as strings for Redis)
            # Note: missing_ppe removed - PPE policy evaluation handled by separate service
            fields = {
                'cameraId': str(detection_result.get('cameraId', camera_id)),
                'tenantId': str(detection_result.get('tenantId', tenant_id)),
                'timestamp': detection_result.get('timestamp', datetime.utcnow().isoformat() + 'Z'),
                'people_count': str(detection_result.get('people_count', 0)),
                'detections': self._serialize_detections(detection_result.get('detections', [])),  # Raw detections only
            }
            
            # Include model metadata for compliance and audit trails (if present)
            # This ensures every detection has full model provenance
            model_metadata = detection_result.get('model')
            if model_metadata:
                fields['model'] = self._serialize_dict(model_metadata)
            
            # Add entry to stream (XADD)
            message_id = self.redis.xadd(
                stream_key,
                {k: str(v) for k, v in fields.items()},
                maxlen=100,  # Limit stream size (keep last 100 detections)
                approximate=True  # Approximate trimming for performance
            )
            
            logger.debug(
                f"Published detection to {stream_key}",
                extra={
                    'stream_key': stream_key,
                    'message_id': message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id,
                    'people_count': detection_result.get('people_count', 0),
                }
            )
            
            return message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id
            
        except redis.RedisError as e:
            logger.error(f"Redis error publishing to {stream_key}: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Error publishing detection to {stream_key}: {e}", exc_info=True)
            return None
    
    def _serialize_detections(self, detections: List[Dict]) -> str:
        """Serialize detections list to JSON string"""
        import json
        return json.dumps(detections)
    
    def _serialize_list(self, items: List) -> str:
        """Serialize list to JSON string"""
        import json
        return json.dumps(items)
    
    def _serialize_dict(self, data: Dict) -> str:
        """Serialize dictionary to JSON string (for model metadata)"""
        import json
        return json.dumps(data)
    
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
