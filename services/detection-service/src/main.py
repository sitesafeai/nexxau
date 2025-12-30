"""
Detection Service - Main Entry Point
"""
import os
import sys
import logging
import signal
import time
import threading
from typing import Optional, Dict
import redis
from prometheus_client import Counter, Histogram, Gauge, start_http_server
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn

# Add src directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model_manager import ModelManager
from redis_consumer import FrameConsumer
from redis_producer import DetectionProducer
from detection_processor import DetectionProcessor
from batch_collector import BatchCollector
from gpu_saturation_handler import GPUSaturationHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
frames_processed_total = Counter(
    'frames_processed_total',
    'Total number of frames processed',
    ['status', 'model_name', 'device']  # success/failed/skipped, model_name, cpu/cuda
)
frames_dropped_total = Counter(
    'frames_dropped_total',
    'Total number of frames dropped (stale frames)',
    ['tenant_id', 'camera_id', 'reason']  # reason: stale_frame
)
inference_latency_ms = Histogram(
    'inference_latency_ms',
    'Inference latency in milliseconds',
    buckets=[10, 50, 100, 200, 500, 1000, 2000, 5000],
    labelnames=['model_name', 'device']  # model_name, cpu/cuda
)
device_type_gauge = Gauge('device_type', 'Device type (0=cpu, 1=gpu)')
redis_stream_lag_entries = Gauge(
    'redis_stream_lag_entries',
    'Redis stream lag in entries (number of unprocessed entries)',
    ['tenant_id', 'camera_id']
)
# GPU batching metrics
gpu_batch_size = Histogram(
    'gpu_batch_size',
    'GPU batch size (number of frames per batch)',
    buckets=[1, 2, 3, 4, 5, 6, 8, 10]
)
gpu_batch_latency_ms = Histogram(
    'gpu_batch_latency_ms',
    'GPU batch latency in milliseconds (time to process entire batch)',
    buckets=[10, 25, 50, 100, 200, 500, 1000]
)
gpu_batches_processed_total = Counter(
    'gpu_batches_processed_total',
    'Total number of GPU batches processed'
)
messages_dlq_total = Counter(
    'messages_dlq_total',
    'Total messages sent to DLQ',
    ['stream', 'error_type']
)

# Global state
app = FastAPI(title="Detection Service")
running = True
model_manager: Optional[ModelManager] = None
redis_client: Optional[redis.Redis] = None
consumer: Optional[FrameConsumer] = None
producer: Optional[DetectionProducer] = None
processor: Optional[DetectionProcessor] = None
gpu_saturation_handler: Optional[GPUSaturationHandler] = None
batch_collector: Optional[BatchCollector] = None
processing_thread: Optional[threading.Thread] = None


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


def process_frames_loop():
    """
def process_frames_loop():
    
    LATEST-FRAME PRIORITY ENFORCEMENT:
    - Reads ALL pending entries per camera stream
    - Keeps ONLY the most recent entry (highest sequence number)
    - Explicitly drops and acknowledges all stale frames
    - Tracks dropped frames with metrics and structured logging
    """
    global running, consumer, producer, processor, gpu_saturation_handler, model_manager
    
    logger.info("Starting frame processing loop")
    processed_sequences: Dict[str, int] = {}  # camera_key -> last processed sequence
    backoff_delay = 1.0  # Exponential backoff starting delay
    
    while running:
        try:
            # Discover all camera streams
            streams = consumer.get_all_camera_streams()
            
            if not streams:
                time.sleep(1)  # No streams yet, wait and retry
                backoff_delay = 1.0  # Reset backoff on success
                continue
            
            # Collect frames from all cameras
            pending_frames = []  # List of (frame_ref, tenant_id, camera_id, camera_key)
            
            for stream_key, tenant_id, camera_id in streams:
                if not running:
                    break
                
                camera_key = f"{tenant_id}:{camera_id}"
                
                # Get latest frame with explicit drop tracking
                frame_ref, dropped_count, dropped_message_ids = consumer.get_latest_frame_with_drops(
                    tenant_id, camera_id
                )
                
                # Update stream lag metric
                stream_length = consumer.get_stream_length(tenant_id, camera_id)
                redis_stream_lag_entries.labels(
                    tenant_id=tenant_id,
                    camera_id=camera_id
                ).set(stream_length)
                
                # Track and log dropped frames
                if dropped_count > 0:
                    frames_dropped_total.labels(
                        tenant_id=tenant_id,
                        camera_id=camera_id,
                        reason='stale_frame'
                    ).inc(dropped_count)
                    
                    logger.info(
                        "Dropped stale frames",
                        extra={
                            'event': 'frames_dropped',
                            'camera_id': camera_id,
                            'tenant_id': tenant_id,
                            'dropped_count': dropped_count,
                            'latest_sequence': frame_ref['sequence'] if frame_ref else None,
                            'dropped_message_ids': dropped_message_ids,
                        }
                    )
                
                if frame_ref is None:
                    continue
                
                # GPU saturation check (before processing) - only in GPU mode
                is_gpu_mode = model_manager.is_gpu() if model_manager else False
                device_str = model_manager.device_str if model_manager else "cpu"
                
                if is_gpu_mode and gpu_saturation_handler is not None:
                    current_lag = stream_length
                    
                    if gpu_saturation_handler.should_drop_frame(current_lag, device_str):
                        frames_dropped_total.labels(
                            tenant_id=tenant_id,
                            camera_id=camera_id,
                            reason='gpu_saturation'
                        ).inc()
                        logger.warning(
                            "Frame dropped due to GPU saturation",
                            extra={
                                'camera_id': camera_id,
                                'tenant_id': tenant_id,
                                'lag': current_lag,
                                'device': device_str
                            }
                        )
                        continue  # Skip this frame
                
                # Skip if already processed (avoid reprocessing same sequence)
                last_sequence = processed_sequences.get(camera_key, -1)
                if frame_ref['sequence'] <= last_sequence:
                    logger.debug(
                        f"Skipping already processed frame",
                        extra={
                            'camera_id': camera_id,
                            'sequence': frame_ref['sequence'],
                            'last_processed': last_sequence,
                        }
                    )
                    continue
                
                # Add to pending frames for processing
                pending_frames.append((frame_ref, tenant_id, camera_id, camera_key))
            
            # Get model metadata labels (once for all frames)
            model_metadata = model_manager.get_model_metadata() if model_manager else {}
            model_name_label = model_metadata.get('name', 'unknown')
            device_label = model_manager.device_str if model_manager else "cpu"
            
            # Process frames based on mode
            is_gpu_mode = model_manager.is_gpu() if model_manager else False
            if is_gpu_mode and batch_collector is not None:
                # GPU MODE: Batch processing
                for frame_ref, tenant_id, camera_id, camera_key in pending_frames:
                    # Prepare frame data for batch collector
                    frame_data = {
                        'frame_path': frame_ref['frame_path'],
                        'camera_id': camera_id,
                        'tenant_id': tenant_id,
                        'sequence': frame_ref['sequence'],
                        'timestamp': frame_ref['timestamp'],
                    }
                    
                    # Try to add to batch (may be rejected if camera already in batch)
                    added = batch_collector.add_frame(frame_data)
                    
                    if added:
                        # Update processed sequence tracking
                        processed_sequences[camera_key] = frame_ref['sequence']
                
                # Check if batch should be flushed
                if batch_collector.should_flush():
                    # Flush and process batch
                    batch_frame_data_list = batch_collector.flush()
                    
                    if batch_frame_data_list:
                        try:
                            # Process batch
                            batch_start_time = time.time()
                            detection_results = processor.process_batch(batch_frame_data_list)
                            batch_latency_ms = (time.time() - batch_start_time) * 1000
                            
                            # Record batch metrics
                            gpu_batches_processed_total.inc()
                            gpu_batch_size.observe(len(batch_frame_data_list))
                            gpu_batch_latency_ms.observe(batch_latency_ms)
                            
                            # Publish all detection results
                            for i, detection_result in enumerate(detection_results):
                                if detection_result is None:
                                    frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc()
                                    continue
                                
                                frame_data = batch_frame_data_list[i]
                                message_id = producer.publish_detection(
                                    tenant_id=frame_data['tenant_id'],
                                    camera_id=frame_data['camera_id'],
                                    detection_result=detection_result
                                )
                                
                                if message_id:
                                    frames_processed_total.labels(status='success', model_name=model_name_label, device=device_label).inc()
                                    inference_latency_ms.labels(model_name=model_name_label, device=device_label).observe(detection_result.get('inference_latency_ms', 0))
                                else:
                                    frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc()
                                    
                        except Exception as e:
                            logger.error(
                                f"Error processing batch",
                                extra={
                                    'batch_size': len(batch_frame_data_list),
                                    'error': str(e),
                                },
                                exc_info=True
                            )
                            frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc(len(batch_frame_data_list))
            else:
                # CPU MODE: Sequential processing (no batching)
                for frame_ref, tenant_id, camera_id, camera_key in pending_frames:
                    # Update processed sequence tracking
                    processed_sequences[camera_key] = frame_ref['sequence']
                    
                    # Get message ID for retry tracking (generate if not available)
                    message_id = frame_ref.get('message_id', f"{camera_id}:{frame_ref['sequence']}")
                    stream_key = f"frames:tenant:{tenant_id}:camera:{camera_id}"
                    
                    # Process frame sequentially
                    try:
                        detection_result = processor.process_frame(
                            frame_path=frame_ref['frame_path'],
                            camera_id=camera_id,
                            tenant_id=tenant_id,
                            sequence=frame_ref['sequence'],
                            timestamp=frame_ref['timestamp']
                        )
                        
                        if detection_result is None:
                            # Processing skipped (rate limited or error)
                            frames_processed_total.labels(status='skipped', model_name=model_name_label, device=device_label).inc()
                            consumer.clear_retry_count(message_id)  # Clear retry on skip
                            logger.debug(
                                f"Frame processing skipped (rate limited or error)",
                                extra={
                                    'camera_id': camera_id,
                                    'sequence': frame_ref['sequence'],
                                }
                            )
                            continue
                        
                        # Publish detection result
                        pub_message_id = producer.publish_detection(
                            tenant_id=tenant_id,
                            camera_id=camera_id,
                            detection_result=detection_result
                        )
                        
                        if pub_message_id:
                            frames_processed_total.labels(status='success', model_name=model_name_label, device=device_label).inc()
                            inference_latency_ms.labels(model_name=model_name_label, device=device_label).observe(detection_result.get('inference_latency_ms', 0))
                            consumer.clear_retry_count(message_id)  # Clear retry on success
                            logger.debug(
                                f"Published detection",
                                extra={
                                    'camera_id': camera_id,
                                    'sequence': frame_ref['sequence'],
                                    'message_id': pub_message_id,
                                }
                            )
                        else:
                            # Publishing failed - increment retry
                            retry_count = consumer.increment_retry_count(message_id)
                            if retry_count >= 3:  # Max retries
                                # Move to DLQ
                                producer.publish_to_dlq(
                                    original_stream=stream_key,
                                    message_id=message_id,
                                    message_data=frame_ref,
                                    error="publish_failed",
                                    retry_count=retry_count
                                )
                                messages_dlq_total.labels(stream=stream_key, error_type="publish_failed").inc()
                                # ACK original message (in this case, frame already processed, just failed to publish)
                                consumer.acknowledge_frame(tenant_id, camera_id, message_id)
                            frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc()
                            logger.warning(
                                f"Failed to publish detection result",
                                extra={
                                    'camera_id': camera_id,
                                    'sequence': frame_ref['sequence'],
                                }
                            )
                        
                    except Exception as e:
                        logger.error(
                            f"Error processing frame",
                            extra={
                                'camera_id': camera_id,
                                'sequence': frame_ref.get('sequence'),
                                'error': str(e),
                            },
                            exc_info=True
                        )
                        
                        # Increment retry count
                        retry_count = consumer.increment_retry_count(message_id)
                        
                        if retry_count >= 3:  # Max retries
                            # Move to DLQ
                            error_type = type(e).__name__
                            producer.publish_to_dlq(
                                original_stream=stream_key,
                                message_id=message_id,
                                message_data=frame_ref,
                                error=str(e),
                                retry_count=retry_count
                            )
                            messages_dlq_total.labels(stream=stream_key, error_type=error_type).inc()
                            # ACK original message to prevent infinite retry
                            consumer.acknowledge_frame(tenant_id, camera_id, message_id)
                        else:
                            frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc()
                        
                        continue
            
            # Limit processed sequences map size (keep last 1000 cameras)
            if len(processed_sequences) > 1000:
                keys_to_remove = list(processed_sequences.keys())[:100]
                for key in keys_to_remove:
                    del processed_sequences[key]
            
            # Reset backoff on successful iteration
            backoff_delay = 1.0
            
            # Small delay to avoid tight loop
            time.sleep(0.1)
            
        except redis.RedisError as e:
            # Exponential backoff on Redis errors
            logger.error(
                f"Redis error in processing loop (retrying in {backoff_delay}s)",
                extra={
                    'error': str(e),
                    'backoff_delay': backoff_delay,
                },
                exc_info=True
            )
            time.sleep(backoff_delay)
            backoff_delay = min(backoff_delay * 2, 60.0)  # Cap at 60 seconds
            
        except Exception as e:
            # Exponential backoff on general errors
            logger.error(
                f"Error in processing loop (retrying in {backoff_delay}s)",
                extra={
                    'error': str(e),
                    'backoff_delay': backoff_delay,
                },
                exc_info=True
            )
            time.sleep(backoff_delay)
            backoff_delay = min(backoff_delay * 2, 60.0)  # Cap at 60 seconds
    
    logger.info("Frame processing loop stopped")


@app.get("/health")
def health():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_healthy = redis_client.ping()
        
        # Check model loaded
        model_healthy = model_manager is not None and model_manager.model is not None
        
        status = "healthy" if (redis_healthy and model_healthy) else "unhealthy"
        
        return JSONResponse({
            "status": status,
            "service": "detection-service",
            "redis": "healthy" if redis_healthy else "unhealthy",
            "model": "loaded" if model_healthy else "not_loaded",
            "device": model_manager.device_str if model_manager else "unknown",
        })
    except Exception as e:
        logger.error(f"Health check error: {e}", exc_info=True)
        return JSONResponse({
            "status": "unhealthy",
            "error": str(e)
        }, status_code=500)


@app.get("/metrics")
def metrics():
    """
    Prometheus metrics endpoint info.
    
    Actual metrics are served by prometheus_client on METRICS_PORT (default 8000).
    
    Available metrics:
    - frames_processed_total{status}: Total frames processed (success/failed/skipped)
    - frames_dropped_total{tenant_id,camera_id,reason}: Total frames dropped (stale frames)
    - inference_latency_ms: Inference latency histogram (milliseconds)
    - device_type: Device type gauge (0=cpu, 1=gpu)
    - redis_stream_lag_entries{tenant_id,camera_id}: Redis stream lag in entries
    """
    # Prometheus metrics are served on separate port (default 8000)
    return {
        "message": "Metrics available at :8000/metrics",
        "metrics": [
            "frames_processed_total",
            "frames_dropped_total",
            "inference_latency_ms",
            "device_type",
            "redis_stream_lag_entries",
        ]
    }


def signal_handler(sig, frame):
    """Handle shutdown signals"""
    global running
    logger.info("Shutdown signal received")
    running = False


def main():
    """Main entry point"""
    global model_manager, redis_client, consumer, producer, processor, processing_thread, running
    
    # Model configuration
    model_path = os.getenv('YOLO_MODEL_PATH', '/models/yolov8n.pt')
    device_str = os.getenv('YOLO_DEVICE', 'cpu').strip().lower()
    
    logger.info("=" * 60)
    logger.info("Detection Service Starting")
    logger.info(f"Model path: {model_path}")
    logger.info(f"Requested device: {device_str}")
    logger.info("=" * 60)
    
    # Load model
    try:
        model_manager = ModelManager(model_path)
        actual_device_str, _ = model_manager.load()
        logger.info(f"Model loaded successfully on: {actual_device_str}")
        
        # Set device type metric
        device_type_gauge.set(1 if model_manager.is_gpu() else 0)
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        sys.exit(1)
    
    # Connect to Redis
    try:
        redis_client = create_redis_client()
        redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        sys.exit(1)
    
    # Initialize components
    consumer = FrameConsumer(redis_client)
    producer = DetectionProducer(redis_client)
    processor = DetectionProcessor(model_manager)
    
    # Initialize GPU saturation handler
    global gpu_saturation_handler
    gpu_saturation_handler = GPUSaturationHandler.from_env()
    logger.info("GPU saturation handler initialized")
    
    # Initialize batch collector for GPU mode
    global batch_collector
    if model_manager.is_gpu():
        gpu_max_batch_size = int(os.getenv('GPU_MAX_BATCH_SIZE', '4'))
        gpu_max_latency_ms = int(os.getenv('GPU_MAX_BATCH_LATENCY_MS', '50'))
        batch_collector = BatchCollector(
            max_batch_size=gpu_max_batch_size,
            max_latency_ms=gpu_max_latency_ms
        )
        logger.info(
            f"GPU batch collector initialized",
            extra={
                'max_batch_size': gpu_max_batch_size,
                'max_latency_ms': gpu_max_latency_ms,
            }
        )
    else:
        batch_collector = None
        logger.info("CPU mode: batch collector not initialized (sequential processing only)")
    
    # Start Prometheus metrics server
    metrics_port = int(os.getenv('METRICS_PORT', 8000))
    start_http_server(metrics_port)
    logger.info(f"Prometheus metrics server started on port {metrics_port}")
    
    # Start processing thread
    processing_thread = threading.Thread(target=process_frames_loop, daemon=True)
    processing_thread.start()
    logger.info("Frame processing thread started")
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start FastAPI server
    api_port = int(os.getenv('PORT', 8080))
    logger.info(f"Starting API server on port {api_port}")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=api_port, log_level="info")
    except KeyboardInterrupt:
        logger.info("API server stopped")
    finally:
        running = False
        if processing_thread:
            processing_thread.join(timeout=5)
        logger.info("Detection service shutdown complete")


if __name__ == "__main__":
    main()
