"""
Main Processing Loop

Orchestrates detection event consumption, violation processing, and state change publishing.
Implements exactly-once semantics and safe retry logic.
"""
import os
import logging
import time
import signal
import sys
from typing import Dict, Optional
from datetime import datetime
import redis
from prometheus_client import Counter, Histogram, start_http_server
from typing import Optional

from .violation_engine import ViolationEngine
from .redis_consumer import DetectionConsumer
from .violation_producer import ViolationStateChangeProducer
from .event_processor import EventProcessor
from .violation_model import ViolationState

logger = logging.getLogger(__name__)

# Prometheus metrics
violations_created_total = Counter(
    'violations_created_total',
    'Total number of violations created',
    ['violation_type', 'tenant_id']
)

violations_escalated_total = Counter(
    'violations_escalated_total',
    'Total number of violations escalated',
    ['violation_type', 'tenant_id']
)

violations_resolved_total = Counter(
    'violations_resolved_total',
    'Total number of violations resolved',
    ['violation_type', 'tenant_id']
)

violation_processing_latency_ms = Histogram(
    'violation_processing_latency_ms',
    'Violation processing latency in milliseconds',
    buckets=[10, 50, 100, 200, 500, 1000, 2000, 5000]
)

messages_dlq_total = Counter(
    'messages_dlq_total',
    'Total messages sent to DLQ',
    ['stream', 'error_type']
)


class ViolationProcessor:
    """
    Main processor for violation engine.
    
    Handles:
    - Detection event consumption
    - Violation processing
    - State change publishing
    - Exactly-once semantics
    - Safe retry logic
    - Poison message handling
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        violation_engine: ViolationEngine,
        worksite_id_mapper: Optional[callable] = None
    ):
        """
        Initialize violation processor.
        
        Args:
            redis_client: Redis client instance
            violation_engine: ViolationEngine instance
            worksite_id_mapper: Optional function to map camera_id -> worksite_id
                                If None, uses camera_id as worksite_id
        """
        self.redis = redis_client
        self.violation_engine = violation_engine
        self.consumer = DetectionConsumer(redis_client)
        self.producer = ViolationStateChangeProducer(redis_client)
        self.event_processor = EventProcessor(violation_engine)
        self.worksite_id_mapper = worksite_id_mapper or (lambda camera_id: camera_id)
        self.messages_dlq_total = messages_dlq_total_metric
        self.running = False
    
    def start(self) -> None:
        """Start processing loop"""
        self.running = True
        logger.info("Starting violation processor")
        
        while self.running:
            try:
                self._process_batch()
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Error in processing loop: {e}", exc_info=True)
                time.sleep(1)  # Backoff on error
        
        logger.info("Violation processor stopped")
    
    def stop(self) -> None:
        """Stop processing loop"""
        self.running = False
    
    def _process_batch(self) -> None:
        """Process a batch of detection events"""
        # Read pending messages first (retry failed messages)
        pending_events = self.consumer.read_messages(count=10, block_ms=1000)
        
        # Then read new messages
        new_events = self.consumer.read_new_messages(count=10, block_ms=0)
        
        all_events = pending_events + new_events
        
        if not all_events:
            # No messages, short sleep to avoid tight loop
            time.sleep(0.1)
            return
        
        # Process events and track message IDs for acknowledgement
        message_ids_to_ack = []
        processed_count = 0
        
        for detection_event in all_events:
            try:
                start_time = time.time()
                
                # Get worksite_id (required but not in detection event)
                worksite_id = self.worksite_id_mapper(detection_event.camera_id)
                
                # Process detection event
                results = self.event_processor.process_detection_event(
                    detection_event,
                    worksite_id
                )
                
                # Process each violation result
                for result in results:
                    if result.violation and result.state_changed:
                        # Publish state change (idempotent)
                        self._publish_state_change(result, detection_event.message_id)
                        
                        # Update metrics
                        self._update_metrics(result)
                
                # Record latency
                latency_ms = (time.time() - start_time) * 1000
                violation_processing_latency_ms.observe(latency_ms)
                
                # Clear retry count on success
                self.consumer.clear_retry_count(detection_event.message_id)
                
                # Mark message for acknowledgement (only after successful processing)
                message_ids_to_ack.append(detection_event.message_id)
                processed_count += 1
                
            except Exception as e:
                logger.error(
                    f"Failed to process detection event {detection_event.message_id}: {e}",
                    exc_info=True
                )
                
                message_id = detection_event.message_id
                original_stream = "detections:raw"
                
                # Increment retry count
                retry_count = self.consumer.increment_retry_count(message_id, max_retries=3)
                max_retries = 3
                
                if retry_count >= max_retries:
                    # Move to DLQ after max retries
                    error_type = type(e).__name__
                    
                    # Convert detection_event to dict for DLQ
                    event_data = {
                        'camera_id': detection_event.camera_id,
                        'tenant_id': detection_event.tenant_id,
                        'timestamp': detection_event.timestamp,
                        'detected_objects': detection_event.detected_objects,
                        'model_metadata': detection_event.model_metadata
                    }
                    
                    dlq_message_id = self.producer.publish_to_dlq(
                        original_stream=original_stream,
                        message_id=message_id,
                        message_data=event_data,
                        error=str(e),
                        retry_count=retry_count
                    )
                    
                    if self.messages_dlq_total:
                        self.messages_dlq_total.labels(stream=original_stream, error_type=error_type).inc()
                    
                    logger.warning(
                        f"Message moved to DLQ after {retry_count} retries",
                        extra={
                            'message_id': message_id,
                            'error': str(e),
                            'error_type': error_type,
                            'dlq_message_id': dlq_message_id
                        }
                    )
                    
                    # ACK original message to prevent infinite retry
                    message_ids_to_ack.append(message_id)
                else:
                    # Retry later - don't ACK yet
                    logger.info(
                        f"Retrying message {message_id} (attempt {retry_count}/{max_retries})",
                        extra={
                            'message_id': message_id,
                            'retry_count': retry_count,
                            'max_retries': max_retries
                        }
                    )
                    # Don't acknowledge - let it be retried
        
        # Acknowledge all successfully processed messages
        if message_ids_to_ack:
            acknowledged = self.consumer.acknowledge_messages(message_ids_to_ack)
            logger.debug(f"Acknowledged {acknowledged}/{len(message_ids_to_ack)} messages")
        
        # Periodically evaluate resolutions
        if processed_count > 0:
            self._evaluate_resolutions()
    
    def _publish_state_change(
        self,
        result: ViolationEngineResult,
        detection_message_id: str
    ) -> None:
        """Publish violation state change to Redis stream"""
        violation = result.violation
        
        # Get old state from result (now tracked in ViolationEngineResult)
        old_state = result.old_state.value if result.old_state else "UNKNOWN"
        
        message_id = self.producer.publish_state_change(
            violation_id=violation.violation_id,
            tenant_id=violation.tenant_id,
            worksite_id=violation.worksite_id,
            camera_id=violation.camera_id,
            violation_type=violation.violation_type,
            old_state=old_state,
            new_state=violation.state.value,
            transition_reason=result.transition_reason,
            should_alert=result.should_alert,
            metadata={
                'detection_message_id': detection_message_id,
                'violation_metadata': violation.metadata,
            }
        )
        
        if message_id:
            logger.info(
                f"Published state change",
                extra={
                    'violation_id': violation.violation_id,
                    'old_state': result.transition_reason,  # Simplified
                    'new_state': violation.state.value,
                    'message_id': message_id,
                }
            )
        else:
            logger.error(f"Failed to publish state change for violation {violation.violation_id}")
    
    def _update_metrics(self, result: ViolationEngineResult) -> None:
        """Update Prometheus metrics based on state change"""
        violation = result.violation
        
        if result.state_changed:
            if violation.state == ViolationState.ACTIVE:
                violations_created_total.labels(
                    violation_type=violation.violation_type,
                    tenant_id=violation.tenant_id
                ).inc()
            elif violation.state == ViolationState.ESCALATED:
                violations_escalated_total.labels(
                    violation_type=violation.violation_type,
                    tenant_id=violation.tenant_id
                ).inc()
            elif violation.state == ViolationState.RESOLVED:
                violations_resolved_total.labels(
                    violation_type=violation.violation_type,
                    tenant_id=violation.tenant_id
                ).inc()
    
    def _evaluate_resolutions(self) -> None:
        """Periodically evaluate violations for resolution"""
        try:
            results = self.violation_engine.evaluate_resolutions()
            
            for result in results:
                if result.violation and result.state_changed:
                    # Publish state change
                    self._publish_state_change(result, "resolution-evaluation")
                    
                    # Update metrics
                    self._update_metrics(result)
        except Exception as e:
            logger.error(f"Error evaluating resolutions: {e}", exc_info=True)


def create_redis_client() -> redis.Redis:
    """Create Redis client from environment variables"""
    host = os.getenv('REDIS_HOST', 'localhost')
    port = int(os.getenv('REDIS_PORT', 6379))
    password = os.getenv('REDIS_PASSWORD') or None
    db = int(os.getenv('REDIS_DB', 0))
    use_ssl = os.getenv('REDIS_TLS', 'false').lower() == 'true'
    
    return redis.Redis(
        host=host,
        port=port,
        password=password,
        db=db,
        ssl=use_ssl,
        decode_responses=False,  # Keep bytes for stream operations
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
    )


def main():
    """Main entry point"""
    import logging
    
    # Setup logging
    logging.basicConfig(
        level=os.getenv('LOG_LEVEL', 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    window_seconds = int(os.getenv('VIOLATION_WINDOW_SECONDS', '10'))
    detection_threshold = int(os.getenv('VIOLATION_DETECTION_THRESHOLD', '3'))
    escalation_seconds = int(os.getenv('VIOLATION_ESCALATION_SECONDS', '120'))
    resolution_seconds = int(os.getenv('VIOLATION_RESOLUTION_SECONDS', '30'))
    suppression_seconds = int(os.getenv('VIOLATION_SUPPRESSION_SECONDS', '60'))
    metrics_port = int(os.getenv('METRICS_PORT', '8000'))
    
    logger.info("=" * 60)
    logger.info("Violation Engine Service Starting")
    logger.info(f"Window seconds: {window_seconds}")
    logger.info(f"Detection threshold: {detection_threshold}")
    logger.info(f"Escalation seconds: {escalation_seconds}")
    logger.info(f"Resolution seconds: {resolution_seconds}")
    logger.info(f"Suppression seconds: {suppression_seconds}")
    logger.info("=" * 60)
    
    # Connect to Redis
    try:
        redis_client = create_redis_client()
        redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        sys.exit(1)
    
    # Initialize violation engine
    violation_engine = ViolationEngine(
        window_seconds=window_seconds,
        detection_threshold=detection_threshold,
        escalation_seconds=escalation_seconds,
        resolution_seconds=resolution_seconds,
        suppression_seconds=suppression_seconds
    )
    
    # Initialize processor
    processor = ViolationProcessor(
        redis_client=redis_client,
        violation_engine=violation_engine,
        messages_dlq_total_metric=messages_dlq_total
    )
    
    # Start Prometheus metrics server
    try:
        start_http_server(metrics_port)
        logger.info(f"Prometheus metrics server started on port {metrics_port}")
    except Exception as e:
        logger.warning(f"Failed to start metrics server: {e}")
    
    # Setup signal handlers
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        processor.stop()
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start processing
    try:
        processor.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

