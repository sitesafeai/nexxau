"""
Snapshot Service - Main Entry Point

Listens to violation state changes and captures snapshots/clips.
"""
import os
import sys
import logging
import signal
import time
import threading
import redis
from typing import Optional
from prometheus_client import Counter, Histogram, start_http_server
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
import uvicorn

from .violation_consumer import ViolationStateChangeConsumer
from .snapshot_capture import SnapshotCapture
from .s3_storage import S3Storage
from .snapshot_repository import SnapshotRepository
from .snapshot_processor import SnapshotProcessor
from .retention_worker import RetentionWorker
from .storage_limit_manager import StorageLimitManager
from .database import create_connection_pool

logger = logging.getLogger(__name__)

# FastAPI app for API endpoints
app = FastAPI(title="Snapshot Service")

# Global instances for API endpoints
snapshot_repository_global: Optional['SnapshotRepository'] = None
s3_storage_global: Optional['S3Storage'] = None

# Prometheus metrics
snapshots_captured_total = Counter(
    'snapshots_captured_total',
    'Total number of snapshots captured',
    ['snapshot_type', 'tenant_id']
)

snapshot_capture_latency_ms = Histogram(
    'snapshot_capture_latency_ms',
    'Snapshot capture latency in milliseconds',
    buckets=[100, 500, 1000, 2000, 5000, 10000]
)

snapshot_upload_latency_ms = Histogram(
    'snapshot_upload_latency_ms',
    'Snapshot upload to S3 latency in milliseconds',
    buckets=[100, 500, 1000, 2000, 5000, 10000]
)


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
        decode_responses=False,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
    )


class SnapshotService:
    """Main snapshot service"""
    
    def __init__(
        self,
        redis_client: redis.Redis,
        snapshot_processor: SnapshotProcessor,
        retention_worker: Optional[RetentionWorker] = None
    ):
        self.redis = redis_client
        self.consumer = ViolationStateChangeConsumer(redis_client)
        self.processor = snapshot_processor
        self.retention_worker = retention_worker
        self.running = False
    
    def start(self) -> None:
        """Start service"""
        self.running = True
        logger.info("Starting snapshot service")
        
        # Start retention worker in background thread if enabled
        if self.retention_worker:
            retention_thread = threading.Thread(
                target=self.retention_worker.start,
                daemon=True
            )
            retention_thread.start()
            logger.info("Retention worker started")
        
        while self.running:
            try:
                self._process_batch()
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Error in processing loop: {e}", exc_info=True)
                time.sleep(1)
        
        if self.retention_worker:
            self.retention_worker.stop()
        
        logger.info("Snapshot service stopped")


@app.get("/snapshots/violation/{violation_id}")
async def get_violation_snapshots(
    violation_id: str,
    tenant_id: str = Query(..., description="Tenant ID for security check"),
    ttl_seconds: int = Query(3600, description="TTL for signed URLs in seconds")
):
    """
    Get snapshots for a violation with signed URLs.
    
    Returns list of snapshots (snapshot + clip if available).
    """
    global snapshot_repository_global, s3_storage_global
    
    if not snapshot_repository_global or not s3_storage_global:
        raise HTTPException(status_code=503, detail="Service not fully initialized")
    
    try:
        # Get snapshots from repository
        snapshots = snapshot_repository_global.get_snapshots_by_violation(violation_id)
        
        if not snapshots:
            raise HTTPException(status_code=404, detail="No snapshots found for violation")
        
        # Security check: verify tenant_id matches
        if snapshots[0].tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Access denied: tenant_id mismatch")
        
        # Generate signed URLs
        result = []
        for snapshot in snapshots:
            signed_url = s3_storage_global.generate_signed_url(
                snapshot.s3_key,
                expiration_seconds=ttl_seconds
            )
            result.append({
                'snapshot_id': str(snapshot.snapshot_id),
                'snapshot_type': snapshot.snapshot_type,
                'signed_url': signed_url,
                'captured_at': snapshot.captured_at.isoformat(),
                'file_size_bytes': snapshot.file_size_bytes,
                'content_type': snapshot.content_type
            })
        
        return JSONResponse(result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching snapshots: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    def stop(self) -> None:
        """Stop service"""
        self.running = False
    
    def _process_batch(self) -> None:
        """Process a batch of violation state changes"""
        # Read pending messages first
        pending_events = self.consumer.read_messages(count=10, block_ms=1000)
        
        # Then read new messages
        new_events = self.consumer.read_new_messages(count=10, block_ms=0)
        
        all_events = pending_events + new_events
        
        if not all_events:
            time.sleep(0.1)
            return
        
        message_ids_to_ack = []
        
        for state_change in all_events:
            try:
                # Check if snapshot should be captured
                if not state_change.should_capture_snapshot():
                    # Acknowledge but don't process
                    message_ids_to_ack.append(state_change.message_id)
                    continue
                
                # Process snapshot capture
                start_time = time.time()
                result = self.processor.process_violation_state_change(state_change)
                latency_ms = (time.time() - start_time) * 1000
                
                # Update metrics
                if result.get('snapshot_captured'):
                    snapshots_captured_total.labels(
                        snapshot_type='snapshot',
                        tenant_id=state_change.tenant_id
                    ).inc()
                    snapshot_capture_latency_ms.observe(latency_ms)
                
                if result.get('clip_captured'):
                    snapshots_captured_total.labels(
                        snapshot_type='clip',
                        tenant_id=state_change.tenant_id
                    ).inc()
                
                # Acknowledge message
                message_ids_to_ack.append(state_change.message_id)
                
            except Exception as e:
                logger.error(
                    f"Failed to process state change {state_change.message_id}: {e}",
                    exc_info=True
                )
                # Acknowledge poison message
                message_ids_to_ack.append(state_change.message_id)
        
        # Acknowledge all processed messages
        if message_ids_to_ack:
            for message_id in message_ids_to_ack:
                self.consumer.acknowledge_message(message_id)


def main():
    """Main entry point"""
    # Setup logging
    logging.basicConfig(
        level=os.getenv('LOG_LEVEL', 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    frames_base_path = os.getenv('FRAMES_BASE_PATH', '/tmp/frames')
    capture_clips = os.getenv('CAPTURE_CLIPS', 'true').lower() == 'true'
    clip_duration_seconds = int(os.getenv('CLIP_DURATION_SECONDS', '5'))
    clip_pre_seconds = int(os.getenv('CLIP_PRE_SECONDS', '2'))
    clip_post_seconds = int(os.getenv('CLIP_POST_SECONDS', '3'))
    signed_url_ttl_seconds = int(os.getenv('SIGNED_URL_TTL_SECONDS', '3600'))
    retention_days = int(os.getenv('RETENTION_DAYS', '30'))
    enable_retention_worker = os.getenv('ENABLE_RETENTION_WORKER', 'true').lower() == 'true'
    metrics_port = int(os.getenv('METRICS_PORT', '8000'))
    
    # S3 configuration
    s3_endpoint_url = os.getenv('S3_ENDPOINT_URL')  # None for AWS S3
    s3_bucket = os.getenv('S3_BUCKET', 'violation-snapshots')
    s3_access_key = os.getenv('S3_ACCESS_KEY')
    s3_secret_key = os.getenv('S3_SECRET_KEY')
    s3_region = os.getenv('S3_REGION', 'us-east-1')
    
    logger.info("=" * 60)
    logger.info("Snapshot Service Starting")
    logger.info(f"Frames base path: {frames_base_path}")
    logger.info(f"Capture clips: {capture_clips}")
    logger.info(f"Retention days: {retention_days}")
    logger.info(f"S3 bucket: {s3_bucket}")
    logger.info("=" * 60)
    
    # Connect to Redis
    try:
        redis_client = create_redis_client()
        redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        sys.exit(1)
    
    # Connect to PostgreSQL
    try:
        db_pool = create_connection_pool()
        if not db_pool:
            logger.error("Failed to create database connection pool")
            sys.exit(1)
        logger.info("Database connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}", exc_info=True)
        sys.exit(1)
    
    # Initialize components
    snapshot_capture = SnapshotCapture(
        frames_base_path=frames_base_path,
        clip_duration_seconds=clip_duration_seconds,
        clip_pre_seconds=clip_pre_seconds,
        clip_post_seconds=clip_post_seconds
    )
    
    s3_storage = S3Storage(
        endpoint_url=s3_endpoint_url,
        bucket_name=s3_bucket,
        access_key=s3_access_key,
        secret_key=s3_secret_key,
        region=s3_region
    )
    
    snapshot_repository = SnapshotRepository(db_pool)
    
    # Set global instances for API endpoints
    global snapshot_repository_global, s3_storage_global
    snapshot_repository_global = snapshot_repository
    s3_storage_global = s3_storage
    
    snapshot_processor = SnapshotProcessor(
        snapshot_capture=snapshot_capture,
        s3_storage=s3_storage,
        snapshot_repository=snapshot_repository,
        capture_clips=capture_clips,
        signed_url_ttl_seconds=signed_url_ttl_seconds
    )
    
    retention_worker = None
    if enable_retention_worker:
        retention_worker = RetentionWorker(
            snapshot_repository=snapshot_repository,
            s3_storage=s3_storage,
            retention_days=retention_days
        )
    
    # Start Prometheus metrics server
    try:
        start_http_server(metrics_port)
        logger.info(f"Prometheus metrics server started on port {metrics_port}")
    except Exception as e:
        logger.warning(f"Failed to start metrics server: {e}")
    
    # Setup signal handlers
    service = SnapshotService(redis_client, snapshot_processor, retention_worker)
    
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        service.stop()
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start service
    try:
        service.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

