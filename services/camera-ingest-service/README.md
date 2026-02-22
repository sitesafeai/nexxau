# Camera Ingest Service

Service for ingesting RTSP camera streams, extracting JPEG frames, and managing camera ingestion processes.

## Features

- Accept RTSP URLs on camera creation
- Spawn FFmpeg process per camera
- Extract JPEG frames at configurable FPS (default: 1 FPS)
- Push frames to Redis Streams (one stream per tenant + camera)
- Frame backpressure handling (drops frames when backlog > 10)
- Max stream length: 20 frames (most recent kept)
- Emit heartbeat every 5 seconds
- Restart FFmpeg on failure with exponential backoff
- Mark camera as DEGRADED after repeated failures
- Health check endpoint with Redis status
- Stream metrics endpoint
- Structured JSON logging

## API Endpoints

### POST /api/v1/cameras
Add/start a camera

**Request:**
```json
{
  "id": "camera-123",
  "tenantId": "tenant-456",
  "rtspUrl": "rtsp://username:password@camera-ip:554/stream1",
  "fps": 1,
  "frameOutputPath": "/tmp/frames/camera-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cameraId": "camera-123",
    "status": "RUNNING"
  }
}
```

### DELETE /api/v1/cameras/:cameraId
Remove/stop a camera

**Response:**
```json
{
  "success": true,
  "data": {
    "cameraId": "camera-123",
    "status": "STOPPED"
  }
}
```

### GET /api/v1/cameras/:cameraId
Get camera state

**Response:**
```json
{
  "success": true,
  "data": {
    "cameraId": "camera-123",
    "tenantId": "tenant-456",
    "status": "RUNNING",
    "failureCount": 0,
    "lastHeartbeat": "2024-01-15T10:30:00.000Z",
    "startedAt": "2024-01-15T10:00:00.000Z",
    "restartAttempt": 0,
    "isProcessRunning": true
  }
}
```

### GET /api/v1/cameras
List all cameras

**Response:**
```json
{
  "success": true,
  "data": {
    "cameras": [
      {
        "cameraId": "camera-123",
        "tenantId": "tenant-456",
        "status": "RUNNING",
        "failureCount": 0,
        "lastHeartbeat": "2024-01-15T10:30:00.000Z",
        "startedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "camera-ingest-service",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "cameras": {
      "status": "healthy",
      "total": 2,
      "running": 2,
      "degraded": 0,
      "details": [...]
    }
  }
}
```

## FFmpeg Command

The service uses the following FFmpeg command to extract frames:

```bash
ffmpeg \
  -rtsp_transport tcp \
  -i <rtsp_url> \
  -vf fps=<fps> \
  -q:v 2 \
  -y \
  /tmp/frames/<cameraId>/frame_%05d.jpg
```

**Parameters:**
- `-rtsp_transport tcp`: Use TCP transport for reliability (vs UDP)
- `-i <rtsp_url>`: Input RTSP stream URL
- `-vf fps=<fps>`: Extract frames at specified FPS (default: 1)
- `-q:v 2`: JPEG quality (1-31, lower is better quality)
- `-y`: Overwrite existing files
- Output pattern: `frame_%05d.jpg`
  - Sequential frame numbering (zero-padded, 5 digits)
  - Example: `frame_00001.jpg`, `frame_00002.jpg`, `frame_00003.jpg`, ...

**Example output files:**
```
/tmp/frames/camera-123/frame_00001.jpg
/tmp/frames/camera-123/frame_00002.jpg
/tmp/frames/camera-123/frame_00003.jpg
...
```

## Restart Logic with Exponential Backoff

When an FFmpeg process fails:

1. **Failure Count**: Incremented on each failure
2. **Status Tracking**:
   - `FAILING`: After first failure
   - `DEGRADED`: After 3 consecutive failures
3. **Exponential Backoff**:
   - Initial delay: 1 second
   - Formula: `min(1000 * 2^(attempt-1), 60000)` ms
   - Maximum delay: 60 seconds
   - Example delays: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, ...
4. **Max Restart Attempts**: 5 attempts before stopping
5. **Failure Reset**: Reset on successful heartbeat (process running)

**Backoff Timeline Example:**
```
Failure 1 → Wait 1s → Restart
Failure 2 → Wait 2s → Restart
Failure 3 → Wait 4s → Restart (Status: DEGRADED)
Failure 4 → Wait 8s → Restart
Failure 5 → Wait 16s → Restart
Failure 6 → Stop (Max attempts reached)
```

## Heartbeat Mechanism

- **Interval**: Every 5 seconds
- **Purpose**: Track camera health and reset failure counts
- **Data Emitted**:
  - Camera ID
  - Tenant ID
  - Timestamp
  - Status (RUNNING, DEGRADED, FAILING, STOPPED)
  - Uptime (seconds since started)
- **Current Implementation**: Logged to structured logs
- **Future**: Will emit to event bus/queue for other services

## Camera Statuses

- **RUNNING**: FFmpeg process is running normally
- **FAILING**: Process failed, restarting with backoff
- **DEGRADED**: Multiple failures (3+), service degraded
- **STOPPED**: Camera ingestion stopped

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Docker

```bash
# Build image
docker build -t camera-ingest-service .

# Run container
docker run -p 3001:3001 \
  -v /tmp/frames:/tmp/frames \
  camera-ingest-service
```

**Note**: FFmpeg is included in the Docker image. For local development, install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

## Environment Variables

### Service Configuration
- `NODE_ENV`: Environment (development, production)
- `PORT`: Service port (default: 3001; use 3001 to avoid conflict with Next.js on 3000)
- `SERVICE_NAME`: Service name
- `SERVICE_VERSION`: Service version
- `LOG_LEVEL`: Logging level (trace, debug, info, warn, error, fatal)

### Redis Configuration
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)
- `REDIS_DB`: Redis database number (default: 0)
- `REDIS_TLS`: Enable TLS (true/false, default: false)

## Frame Storage

Frames are stored in `/tmp/frames/<cameraId>/` by default.

**File naming pattern:**
```
frame_%05d.jpg
```

**Example:**
```
/tmp/frames/camera-123/
  frame_00001.jpg
  frame_00002.jpg
  frame_00003.jpg
  ...
```

**Note**: Frames are numbered sequentially starting from 00001. The frame number increments with each extracted frame. If the process restarts, numbering starts from 00001 again (FFmpeg will overwrite existing files with `-y` flag, or you can clear the directory before restart).

## Monitoring

Monitor camera health via:
- Health check endpoint: `GET /health`
- Camera state endpoint: `GET /api/v1/cameras/:cameraId`
- Structured logs (JSON format)

Key metrics to track:
- Camera status (RUNNING vs DEGRADED)
- Failure count per camera
- Process uptime
- Heartbeat timestamps