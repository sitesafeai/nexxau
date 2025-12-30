# Detection Service

Production-ready PPE detection service using YOLO inference with CPU and GPU support.

## Overview

The Detection Service:
- Consumes frame references from Redis Streams (`frames:tenant:{tenantId}:camera:{cameraId}`)
- Loads JPEG frames from disk
- Runs YOLO inference (YOLOv8 or newer)
- Publishes detection results to Redis Streams (`detections:tenant:{tenantId}:camera:{cameraId}`)
- Exposes health and metrics endpoints

## Runtime Modes

The service supports two execution modes via `YOLO_DEVICE` environment variable:

### CPU Mode (Default)
- **Usage**: `YOLO_DEVICE=cpu` or unset (defaults to CPU)
- **Behavior**: 
  - Sequential frame processing
  - Max 1 FPS per camera (rate limiting)
  - No batching
  - Suitable for local Mac development and testing
- **Purpose**: Functional testing and end-to-end pipeline validation

### GPU Mode
- **Usage**: `YOLO_DEVICE=cuda:0`
- **Behavior**:
  - Batch processing with fairness guarantees (see GPU Mode Behavior section)
  - Higher throughput with configurable batch size (default: 4)
  - Lower latency per frame with strict latency enforcement (default: 50ms)
- **Fallback**: If CUDA requested but unavailable, automatically falls back to CPU with warning

## Installation

### CPU Mode (Mac/Local Development)

```bash
# Install dependencies
pip install -r requirements.txt

# Note: PyTorch CPU version is installed by default
```

### GPU Mode (CUDA)

```bash
# Install CUDA-enabled PyTorch first
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Then install other dependencies
pip install -r requirements.txt
```

## Configuration

### Environment Variables

```bash
# Service ports
PORT=8080                    # API server port
METRICS_PORT=8000            # Prometheus metrics port

# YOLO Configuration
YOLO_MODEL_PATH=/models/yolov8n.pt  # Path to YOLO model file
YOLO_DEVICE=cpu              # Device: 'cpu' or 'cuda:0'

# GPU Batching Configuration (GPU mode only)
GPU_MAX_BATCH_SIZE=4          # Maximum frames per batch (default: 4)
GPU_MAX_BATCH_LATENCY_MS=50   # Maximum latency for oldest frame (default: 50ms)

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false
```

### Model Files

Place your YOLO model file at the path specified by `YOLO_MODEL_PATH`.

Default model location: `/models/yolov8n.pt`

You can download a pre-trained model:
```bash
# Download YOLOv8n (nano - smallest)
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt -O /models/yolov8n.pt

# Or use ultralytics to download
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

## Running the Service

### Local Development (Mac - CPU Mode)

```bash
# Set environment variables
export YOLO_DEVICE=cpu
export YOLO_MODEL_PATH=./models/yolov8n.pt
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Run service
python src/main.py
```

The service will:
1. Load YOLO model on CPU
2. Connect to Redis
3. Start consuming frame references
4. Run inference and publish results
5. Expose API on port 8080 and metrics on port 8000

### Docker (CPU Mode)

```bash
# Build image
docker build -t detection-service .

# Run container
docker run -p 8080:8080 -p 8000:8000 \
  -e YOLO_DEVICE=cpu \
  -e YOLO_MODEL_PATH=/models/yolov8n.pt \
  -e REDIS_HOST=redis \
  -v /path/to/models:/models \
  -v /tmp/frames:/tmp/frames \
  detection-service
```

### GPU Mode (CUDA)

```bash
# Set device to CUDA
export YOLO_DEVICE=cuda:0

# Run service (same as CPU mode)
python src/main.py
```

If CUDA is not available, the service will log a warning and automatically fall back to CPU.

### Docker GPU (NVIDIA)

```bash
# Build with CUDA base image (modify Dockerfile first)
docker build -f Dockerfile.gpu -t detection-service:gpu .

# Run with NVIDIA runtime
docker run --gpus all \
  -p 8080:8080 -p 8000:8000 \
  -e YOLO_DEVICE=cuda:0 \
  -e YOLO_MODEL_PATH=/models/ppe.pt \
  -e REDIS_HOST=redis \
  -v /path/to/models:/models \
  -v /tmp/frames:/tmp/frames \
  detection-service:gpu
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "detection-service",
  "redis": "healthy",
  "model": "loaded",
  "device": "cpu"
}
```

### GET /metrics

Prometheus metrics endpoint (redirects to :8000/metrics).

## Metrics

The service exposes Prometheus metrics on port 8000:

- `frames_processed_total{status,model_name,device}` - Total frames processed
  - `status`: success|failed|skipped
  - `model_name`: Model name label (e.g., "yolov8n")
  - `device`: Device type (cpu|cuda)
- `inference_latency_ms{model_name,device}` - Inference latency histogram (milliseconds)
  - `model_name`: Model name label
  - `device`: Device type (cpu|cuda)
- `device_type` - Device type gauge (0=cpu, 1=gpu)
- `redis_stream_lag_entries{tenant_id,camera_id}` - Redis stream lag in entries
- `gpu_batch_size` - GPU batch size histogram (frames per batch)
- `gpu_batch_latency_ms` - GPU batch latency histogram (milliseconds)
- `gpu_batches_processed_total` - Total GPU batches processed

## Redis Streams

### Input Streams

Consumes from: `frames:tenant:{tenantId}:camera:{cameraId}`

**Frame Reference Format:**
```json
{
  "frame_path": "/tmp/frames/cam-456/frame_00042.jpg",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "size": 125430,
  "sequence": 42
}
```

**Behavior:**
- Always consumes ONLY the most recent frame per camera
- Discards stale frames (older entries are skipped)
- Acknowledges entries after processing

### Output Streams

Publishes to: `detections:tenant:{tenantId}:camera:{cameraId}`

**Detection Result Format (Raw Detections Only):**
```json
{
  "cameraId": "cam-456",
  "tenantId": "company-123",
  "timestamp": "2024-01-15T10:30:01.000Z",
  "sequence": 42,
  "people_count": 3,
  "detections": [
    {
      "class": "person",
      "confidence": 0.92,
      "bbox": [100.5, 200.3, 150.7, 300.9]
    },
    {
      "class": "helmet",
      "confidence": 0.88,
      "bbox": [105.2, 205.1, 145.6, 295.4]
    },
    {
      "class": "vest",
      "confidence": 0.85,
      "bbox": [102.0, 210.0, 148.0, 290.0]
    }
  ],
  "inference_latency_ms": 125.5,
  "model": {
    "name": "yolov8n",
    "version": "8.0.0",
    "sha": "a1b2c3d4e5f6...",
    "device": "cpu"
  }
}
```

**Important:** Detection Service outputs **raw detections only** (objects, bounding boxes, confidence scores). 
- ❌ **No PPE compliance decisions**
- ❌ **No violation labels**  
- ❌ **No missing_ppe field**

PPE policy evaluation is handled by a separate **PPE Policy Service** that:
- Consumes raw detections from this service
- Applies tenant/worksite-specific PPE rules
- Generates violations separately

See [Architecture](#architecture-separation-of-concerns) section for details.

**Model Metadata:**
Every detection includes a `model` field with metadata collected at model load time:
- `name`: Model name (e.g., "yolov8n", extracted from file path)
- `version`: Model version from Ultralytics (if available)
- `sha`: SHA256 hash of model file (content-based identification for audit compliance)
- `device`: Device type used ("cpu" or "cuda:0", "cuda:1", etc.)

This metadata ensures full model provenance for compliance and insurance workflows. Metadata is immutable and attached once per model instance.

## CPU Mode Behavior

**Important**: CPU mode is designed for functional testing only.

- **Rate Limiting**: Maximum 1 FPS per camera
- **Processing**: Sequential (one frame at a time)
- **No Batching**: Frames processed individually
- **Purpose**: Validate pipeline, test end-to-end flow

CPU mode will skip frames if they arrive faster than 1 FPS to maintain stability.

## GPU Mode Behavior (Batching Enabled)

In GPU mode, the service uses intelligent batching with strict guarantees:

### Batch Formation Rules
- **Fairness**: Maximum 1 frame per camera per batch (no camera domination)
- **Batch Flush Conditions** (flushes when EITHER condition is met):
  - Batch size reaches `GPU_MAX_BATCH_SIZE` (default: 4)
  - Oldest frame in batch exceeds `GPU_MAX_BATCH_LATENCY_MS` (default: 50ms)
- **Latency Safety**: Frames never wait indefinitely; latency threshold is strictly enforced

### Configuration
```bash
GPU_MAX_BATCH_SIZE=4          # Maximum frames per batch (default: 4)
GPU_MAX_BATCH_LATENCY_MS=50   # Maximum latency for oldest frame (default: 50ms)
```

### Batching Metrics
- `gpu_batch_size`: Histogram of batch sizes (frames per batch)
- `gpu_batch_latency_ms`: Histogram of batch processing latency (milliseconds)
- `gpu_batches_processed_total`: Counter of total batches processed

### Batch Logging
Every batch execution is logged with:
- Batch size
- Batch latency (milliseconds)
- Camera IDs included in batch
- Device type

This ensures deterministic and auditable batch processing behavior.

## Error Handling

The service handles errors gracefully:

- **Missing frame file**: Logs error and skips frame
- **Model inference failure**: Logs error and continues processing
- **Redis unavailable**: Retries with exponential backoff
- **CUDA unavailable**: Falls back to CPU automatically

**The service will NEVER crash on bad frames or inference errors.**

## Development on Mac

### Prerequisites

1. **Python 3.11+**
2. **Redis** (running locally or accessible)
3. **YOLO model file** (download or provide your own)

### Setup

```bash
# Install dependencies (CPU-only PyTorch is fine)
pip install -r requirements.txt

# Download a YOLO model (if needed)
mkdir -p models
python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); model.save('models/yolov8n.pt')"

# Start Redis (if not running)
# brew install redis
# redis-server

# Run service
export YOLO_DEVICE=cpu
export YOLO_MODEL_PATH=./models/yolov8n.pt
export REDIS_HOST=localhost
python src/main.py
```

### Testing

1. Ensure Camera Ingest Service is running and producing frames
2. Verify frames exist in `/tmp/frames/{cameraId}/`
3. Check Redis streams: `redis-cli XREVRANGE frames:tenant:*:camera:* COUNT 1`
4. Monitor detection results: `redis-cli XREVRANGE detections:tenant:*:camera:* COUNT 1`
5. Check health: `curl http://localhost:8080/health`
6. Check metrics: `curl http://localhost:8000/metrics`

## Logging

The service logs to stdout with structured format:

```
2024-01-15 10:30:00 - model_manager - INFO - Loading YOLO model from: /models/yolov8n.pt
2024-01-15 10:30:01 - model_manager - INFO - Device: cpu (requested: cpu)
2024-01-15 10:30:02 - model_manager - INFO - Model loaded successfully on cpu
2024-01-15 10:30:03 - main - INFO - Redis connected successfully
```

## Troubleshooting

### Model fails to load
- Check `YOLO_MODEL_PATH` points to valid model file
- Verify model file exists and is readable
- Check disk space

### CUDA fallback to CPU
- Check CUDA installation: `python -c "import torch; print(torch.cuda.is_available())"`
- Verify CUDA-enabled PyTorch is installed
- Check GPU availability: `nvidia-smi`

### Redis connection errors
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_HOST` and `REDIS_PORT` settings
- Verify network connectivity

### No frames being processed
- Verify Camera Ingest Service is running
- Check Redis streams exist: `redis-cli KEYS "frames:tenant:*"`
- Verify frame files exist on disk
- Check service logs for errors

## Architecture Notes

- **Single Model Instance**: Model loaded once at startup (not per request)
- **Stream Discovery**: Automatically discovers all camera streams
- **Latest Frame Only**: Always processes most recent frame per camera
- **Graceful Degradation**: Continues running on errors
- **Thread-Safe**: Processing loop runs in separate thread
