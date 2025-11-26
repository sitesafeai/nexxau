-# Troubleshooting Tools Status

## ✅ Implemented & Ready to Test

### 1. **AI Inference Test** (`test_ai_inference`)
- **Status**: ✅ Functional
- **What it does**:
  - Checks AI service health at `http://localhost:8000/health` (or `AI_SERVICE_URL` env var)
  - Sends a test detection to `/api/yolo/detections` endpoint
  - Returns health status and inference test results
- **Requirements**:
  - AI detection service must be running on port 8000 (or configured via `AI_SERVICE_URL`)
  - YOLO detection API endpoint must be accessible
- **Test**: Click "Test AI Inference" in Support & Audit Logs → Troubleshooting Tools

### 2. **View Raw Detections** (`view_raw_detections`)
- **Status**: ✅ Fully Functional
- **What it does**:
  - Fetches last 20 detections from database for specified camera
  - Returns detection data, timestamps, metadata, and frame dimensions
- **Requirements**: Camera must have detections in database
- **Test**: Select a camera and click "View Raw Detections"

### 3. **Check Network Latency** (`check_network_latency`)
- **Status**: ✅ Functional
- **What it does**:
  - Pings MediaMTX (port 8889)
  - Pings AI Service (port 8000 or `AI_SERVICE_URL`)
  - Tests database connection latency
  - If cameraId provided, pings camera IP address
- **Requirements**:
  - MediaMTX must be running
  - AI service must be accessible
  - Camera must have `ipAddress` set in database
- **Test**: Click "Check Network Latency" (optionally provide cameraId)

### 4. **Re-sync Camera Streams** (`resync_camera_streams`)
- **Status**: ✅ Functional
- **What it does**:
  - Updates `updatedAt` timestamp for all cameras in a worksite
  - Triggers camera reconnection logic
  - Returns list of cameras affected
- **Requirements**: Worksite must have cameras
- **Test**: Select a worksite and click "Re-sync Camera Streams"

### 5. **Export Camera Logs** (`export_camera_logs`)
- **Status**: ✅ Fully Functional
- **What it does**:
  - Exports audit logs (last 500)
  - Exports camera health records (last 100)
  - Exports detections (last 100)
  - Returns comprehensive log data in JSON format
- **Requirements**: Camera must exist
- **Test**: Select a camera and click "Export Camera Logs"

### 6. **Snap Test Frame** (`snap_test_frame`)
- **Status**: ⚠️ Partially Functional
- **What it does**:
  - Checks if camera stream URL is accessible
  - Verifies stream connectivity
  - Returns camera info and stream status
- **Limitations**:
  - Does NOT actually capture a frame (requires ffmpeg)
  - Only checks if stream URL is reachable
- **To make fully functional**:
  - Install ffmpeg: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
  - Add frame capture logic using: `ffmpeg -i <streamUrl> -vframes 1 -q:v 2 frame.jpg`
- **Test**: Select a camera and click "Snap Test Frame"

## 🔧 System Tools Status

### 1. **Restart MediaMTX** (`restart_mediamtx`)
- **Status**: ✅ Functional
- **What it does**:
  - Stops and removes existing MediaMTX container
  - Starts new MediaMTX container with configured ports
- **Requirements**:
  - Docker must be installed and running
  - MediaMTX config file must exist at path in `MEDIAMTX_CONFIG_PATH` env var
- **Test**: Click "Restart Camera Streams" in System Settings → System Tools

### 2. **Restart AI Inference Worker** (`restart_ai_worker`)
- **Status**: ✅ Functional (with checks)
- **What it does**:
  - Checks if AI detection container exists (`ai-detection`)
  - Restarts container if found
  - If no container, checks if AI service is accessible via HTTP
  - Returns appropriate status message
- **Requirements**:
  - AI service must be running (either in Docker or standalone)
  - Docker must be installed if using containerized AI service
- **Test**: Click "Restart AI Inference Worker" in System Settings → System Tools

### 3. **Clear Stuck Alerts** (`clear_stuck_alerts`)
- **Status**: ✅ Fully Functional
- **What it does**:
  - Finds alerts older than 24 hours with status 'ACTIVE'
  - Marks them as 'RESOLVED'
  - Returns count of cleared alerts
- **Test**: Click "Clear Stuck Alerts" in System Settings → System Tools

### 4. **Health Check** (`health_check`)
- **Status**: ✅ Fully Functional
- **What it does**:
  - Checks database health (response time)
  - Checks AI service health (HTTP endpoint)
  - Checks MediaMTX health (API endpoint)
  - Returns health status for each service
- **Test**: Click "Run Health Check" in System Settings → System Tools

## 📋 Setup Requirements

### For Full Functionality:

1. **AI Detection Service**:
   ```bash
   # Option 1: Run in Docker
   docker run -d --name ai-detection -p 8000:8000 your-ai-service-image
   
   # Option 2: Run standalone
   # Set AI_SERVICE_URL in .env.local
   ```

2. **MediaMTX**:
   ```bash
   # Already configured via Docker
   # Ensure MEDIAMTX_CONFIG_PATH is set in .env.local
   ```

3. **Environment Variables** (`.env.local`):
   ```env
   AI_SERVICE_URL=http://localhost:8000
   MEDIAMTX_CONFIG_PATH=/Users/luizcarneiro/mediamtx/mediamtx.yml
   MEDIAMTX_HLS_PORT=8888
   MEDIAMTX_RTSP_PORT=8554
   ```

4. **For Frame Capture** (optional):
   ```bash
   # macOS
   brew install ffmpeg
   
   # Linux
   apt-get install ffmpeg
   ```

## 🧪 Testing Checklist

- [ ] AI Inference Test - Verify AI service is running
- [ ] View Raw Detections - Select camera with detections
- [ ] Check Network Latency - Test all service connections
- [ ] Re-sync Camera Streams - Select worksite with cameras
- [ ] Export Camera Logs - Select camera and verify log export
- [ ] Snap Test Frame - Verify stream accessibility (frame capture requires ffmpeg)
- [ ] Restart MediaMTX - Verify Docker is running
- [ ] Restart AI Worker - Verify AI service container or standalone service
- [ ] Clear Stuck Alerts - Verify alerts are cleared
- [ ] Health Check - Verify all services are healthy

## ⚠️ Known Limitations

1. **Frame Capture**: Requires ffmpeg installation for actual frame capture
2. **AI Service**: Must be running and accessible for inference tests
3. **Camera IP Ping**: Requires camera to have `ipAddress` field set
4. **Docker Commands**: Require Docker to be installed and running

## 🚀 Next Steps

1. Install ffmpeg for frame capture functionality
2. Ensure AI detection service is running
3. Test each troubleshooting tool with real cameras
4. Monitor logs for any errors during testing

