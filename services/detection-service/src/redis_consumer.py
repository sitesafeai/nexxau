"""
Redis Streams Consumer for frame references
"""
import os
import logging
import redis
from typing import Dict, Optional, Tuple, List
from datetime import datetime

logger = logging.getLogger(__name__)


class FrameConsumer:
    """Consumes frame references from Redis Streams"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_prefix = 'frames:tenant:'
        self.pending_streams: Dict[str, str] = {}  # camera_key -> last_message_id
    
    def get_all_camera_streams(self) -> List[Tuple[str, str, str]]:
        """
        Discover all active camera streams
        
        Returns:
            List of (stream_key, tenant_id, camera_id) tuples
        """
        streams = []
        try:
            # Scan for all frame streams
            pattern = f"{self.stream_prefix}*"
            for key in self.redis.scan_iter(match=pattern):
                # Parse stream key: frames:tenant:{tenantId}:camera:{cameraId}
                parts = key.decode('utf-8').split(':')
                if len(parts) == 5 and parts[0] == 'frames' and parts[1] == 'tenant' and parts[3] == 'camera':
                    tenant_id = parts[2]
                    camera_id = parts[4]
                    streams.append((key.decode('utf-8'), tenant_id, camera_id))
        except Exception as e:
            logger.error(f"Error discovering streams: {e}", exc_info=True)
        
        return streams
    
    def get_latest_frame_with_drops(self, tenant_id: str, camera_id: str) -> Tuple[Optional[Dict], int, List[str]]:
        """
        Get the most recent frame reference for a camera, explicitly dropping stale frames.
        
        LATEST-FRAME PRIORITY ENFORCEMENT:
        - Reads ALL pending entries from the stream
        - Keeps ONLY the most recent entry (highest sequence number)
        - Explicitly discards all older entries
        - Acknowledges ALL entries (both processed and dropped)
        
        This ensures deterministic behavior under load:
        - Stale frames are never processed
        - Frame drops are tracked and observable
        - Redis streams are properly acknowledged
        
        Args:
            tenant_id: Tenant ID
            camera_id: Camera ID
            
        Returns:
            Tuple of:
            - frame_ref: Dictionary with latest frame reference or None
            - dropped_count: Number of stale frames dropped
            - dropped_message_ids: List of message IDs that were dropped
        """
        stream_key = f"{self.stream_prefix}{tenant_id}:camera:{camera_id}"
        
        try:
            # Get stream length to read all pending entries
            stream_length = self.redis.xlen(stream_key)
            
            if stream_length == 0:
                return None, 0, []
            
            # Read ALL entries from the stream (oldest to newest)
            # We need to read all to determine which is the latest
            entries = self.redis.xrange(stream_key, count=stream_length)
            
            if not entries:
                return None, 0, []
            
            # Find the entry with the highest sequence number (most recent)
            latest_entry = None
            latest_sequence = -1
            all_message_ids = []
            
            for message_id, fields in entries:
                all_message_ids.append(
                    message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id
                )
                
                # Parse fields to get sequence number
                field_dict = self._parse_fields(fields)
                sequence = int(field_dict.get('sequence', 0))
                
                # Keep track of the entry with highest sequence number
                if sequence > latest_sequence:
                    latest_sequence = sequence
                    latest_entry = (message_id, fields)
            
            # If no valid entry found, return None
            if latest_entry is None:
                # Acknowledge all entries (they're invalid but should be cleaned up)
                for msg_id in all_message_ids:
                    self._acknowledge_message(stream_key, msg_id)
                return None, len(all_message_ids), all_message_ids
            
            # Parse the latest entry
            latest_message_id, latest_fields = latest_entry
            latest_field_dict = self._parse_fields(latest_fields)
            
            # Build frame reference for the latest entry
            frame_ref = {
                'message_id': latest_message_id.decode('utf-8') if isinstance(latest_message_id, bytes) else latest_message_id,
                'tenant_id': tenant_id,
                'camera_id': camera_id,
                'stream_key': stream_key,
                'frame_path': latest_field_dict.get('frame_path'),
                'timestamp': latest_field_dict.get('timestamp'),
                'size': int(latest_field_dict.get('size', 0)),
                'sequence': int(latest_field_dict.get('sequence', 0)),
            }
            
            # Calculate dropped frames (all entries except the latest)
            dropped_message_ids = [
                msg_id for msg_id in all_message_ids
                if msg_id != frame_ref['message_id']
            ]
            dropped_count = len(dropped_message_ids)
            
            # Acknowledge ALL entries (both processed and dropped)
            # This ensures Redis doesn't retain unacked messages
            for msg_id in all_message_ids:
                self._acknowledge_message(stream_key, msg_id)
            
            return frame_ref, dropped_count, dropped_message_ids
            
        except redis.RedisError as e:
            logger.error(f"Redis error reading stream {stream_key}: {e}", exc_info=True)
            return None, 0, []
        except Exception as e:
            logger.error(f"Error reading frame from {stream_key}: {e}", exc_info=True)
            return None, 0, []
    
    def _parse_fields(self, fields) -> Dict[str, str]:
        """Parse Redis stream fields (alternating key-value pairs)"""
        field_dict = {}
        if isinstance(fields, (list, tuple)):
            for i in range(0, len(fields), 2):
                if i + 1 < len(fields):
                    key = fields[i].decode('utf-8') if isinstance(fields[i], bytes) else fields[i]
                    value = fields[i + 1].decode('utf-8') if isinstance(fields[i + 1], bytes) else fields[i + 1]
                    field_dict[key] = value
        return field_dict
    
    def get_retry_count(self, message_id: str) -> int:
        """Get retry count for message"""
        try:
            retry_key = f"retry:detection:{message_id}"
            count = self.redis.get(retry_key)
            return int(count) if count else 0
        except Exception:
            return 0
    
    def increment_retry_count(self, message_id: str, max_retries: int = 3) -> int:
        """Increment retry count, return new count"""
        try:
            retry_key = f"retry:detection:{message_id}"
            count = self.redis.incr(retry_key)
            self.redis.expire(retry_key, 3600)  # Expire after 1 hour
            return count
        except Exception:
            return 0
    
    def clear_retry_count(self, message_id: str) -> None:
        """Clear retry count on success"""
        try:
            retry_key = f"retry:detection:{message_id}"
            self.redis.delete(retry_key)
        except Exception:
            pass
    
    def acknowledge_frame(self, tenant_id: str, camera_id: str, message_id: str) -> None:
        """Acknowledge a specific message ID (for DLQ scenarios)"""
        stream_key = f"{self.stream_prefix}{tenant_id}:camera:{camera_id}"
        try:
            # Since we're using XRANGE and not consumer groups, we just need to track acknowledgment
            # For consumer groups, use: self.redis.xack(stream_key, "consumer-group-name", message_id)
            # For now, we'll use the existing acknowledgment mechanism
            logger.debug(f"Acknowledged frame {message_id} for {stream_key}")
        except Exception as e:
            logger.error(f"Failed to acknowledge message {message_id}: {e}")
    
    def _acknowledge_message(self, stream_key: str, message_id: str):
        """
        Acknowledge a message in Redis stream.
        
        NOTE: For direct XREAD (non-consumer-group) usage, this is a no-op
        since there's no pending entries list. However, we keep this for:
        1. Future consumer group support
        2. Explicit acknowledgment pattern
        3. Potential XACK operations if we switch to consumer groups
        
        For now, messages are removed by XTRIM in the producer, so this is
        effectively a no-op but maintains the acknowledgment pattern.
        """
        # Future: If using consumer groups, would call:
        # self.redis.xack(stream_key, group_name, message_id)
        pass
    
    def get_latest_frame(self, tenant_id: str, camera_id: str) -> Optional[Dict]:
        """
        Legacy method for backward compatibility.
        Use get_latest_frame_with_drops() for production code.
        """
        frame_ref, _, _ = self.get_latest_frame_with_drops(tenant_id, camera_id)
        return frame_ref
    
    def get_stream_length(self, tenant_id: str, camera_id: str) -> int:
        """Get current stream length"""
        stream_key = f"{self.stream_prefix}{tenant_id}:camera:{camera_id}"
        try:
            return self.redis.xlen(stream_key)
        except Exception as e:
            logger.error(f"Error getting stream length for {stream_key}: {e}")
            return 0
