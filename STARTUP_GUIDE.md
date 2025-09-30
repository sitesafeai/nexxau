# 🚀 Nexxau AI Detection - Complete Startup Guide

This guide will help you get the entire Nexxau AI Detection system running from scratch.

## 📋 Prerequisites

- **Node.js** (v18+)
- **Python** (v3.8+)
- **Docker** (for MediaMTX)
- **FFmpeg** (for RTSP to HLS conversion)
- **Git** (for version control)

## 🎯 Complete Startup Process

### 1. **Start the Web Application**
```bash
cd app
npm install
npm run dev
```
**Status**: Web app running on `http://localhost:3000`

### 2. **Start the RTSP-to-HLS Conversion Server**
```bash
cd rtsp-server
npm install
node rtsp-server.js
```
**Status**: RTSP server running on `http://localhost:8888`

### 3. **Start MediaMTX (Alternative/Additional)**
```bash
# Option A: Using Docker
docker run --rm -it -p 8888:8888 -p 1935:1935 -v $(pwd)/mediamtx.yml:/mediamtx.yml bluenviron/mediamtx

# Option B: Using local binary
./start-mediamtx.sh
```
**Status**: MediaMTX running on `http://localhost:8888`

### 4. **Start YOLO Detection Service**
```bash
cd ai-detection
python3 -m pip install -r requirements.txt
python3 detection_manager.py
```
**Status**: YOLO detection running and processing live streams

## 🔧 Individual Component Startup

### **Web Application Only**
```bash
cd app
npm run dev
```
- **URL**: http://localhost:3000
- **Features**: Dashboard, camera management, alerts, rules

### **RTSP-to-HLS Server Only**
```bash
cd rtsp-server
node rtsp-server.js
```
- **URL**: http://localhost:8888
- **Features**: Converts RTSP streams to HLS for web playback

### **YOLO Detection Only**
```bash
cd ai-detection
python3 real_time_detector.py --camera-id people_test --stream-url rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people
```
- **Features**: Real-time object detection on video streams

## 🎥 **Live Stream URLs**

### **Working Test Streams:**
1. **People Detection Stream** (RTSP):
   - `rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people`
   - **HLS**: `http://localhost:8888/streams/people/index.m3u8`

2. **Apple Test Stream** (HLS):
   - `https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8`

3. **Alternative Test Stream** (HLS):
   - `https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8`

## 🚀 **Quick Start (All Services)**

Create a startup script:

```bash
#!/bin/bash
# start_all.sh

echo "🚀 Starting Nexxau AI Detection System..."

# Start Web App
echo "📱 Starting Web Application..."
cd app && npm run dev &
WEB_PID=$!

# Start RTSP Server
echo "🎥 Starting RTSP-to-HLS Server..."
cd ../rtsp-server && node rtsp-server.js &
RTSP_PID=$!

# Start YOLO Detection
echo "🤖 Starting YOLO Detection..."
cd ../ai-detection && python3 detection_manager.py &
YOLO_PID=$!

echo "✅ All services started!"
echo "🌐 Web App: http://localhost:3000"
echo "🎥 RTSP Server: http://localhost:8888"
echo "🤖 YOLO Detection: Running in background"

# Wait for user to stop
echo "Press Ctrl+C to stop all services"
wait
```

## 🔍 **Verification Steps**

### 1. **Check Web App**
```bash
curl http://localhost:3000/api/cameras
```
**Expected**: JSON response with camera list

### 2. **Check RTSP Server**
```bash
curl http://localhost:8888/api/test
```
**Expected**: `{"message":"RTSP-HLS server is running","port":8888}`

### 3. **Check HLS Stream**
```bash
curl http://localhost:8888/streams/people/index.m3u8
```
**Expected**: HLS playlist content

### 4. **Check YOLO Detection**
```bash
curl http://localhost:3000/api/yolo/detections
```
**Expected**: `{"success":true,"detections":[],"count":0}`

## 🐳 **Docker Setup (Optional)**

### **Docker Compose**
```yaml
version: '3.8'
services:
  web:
    build: ./app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DIRECT_URL=${DIRECT_URL}
  
  rtsp-server:
    build: ./rtsp-server
    ports:
      - "8888:8888"
    volumes:
      - ./rtsp-server/streams:/app/streams
  
  yolo:
    build: ./ai-detection
    volumes:
      - ./ai-detection:/app
    command: python3 detection_manager.py
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

1. **Port Conflicts**
   - Web app: Change port in `package.json`
   - RTSP server: Change port in `rtsp-server.js`

2. **Python Dependencies**
   ```bash
   cd ai-detection
   python3 -m pip install -r requirements.txt
   ```

3. **Database Connection**
   ```bash
   cd app
   npx prisma migrate dev
   npx prisma generate
   ```

4. **RTSP Stream Issues**
   - Check if stream URL is accessible
   - Verify FFmpeg is installed
   - Check RTSP server logs

## 📊 **System Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web App       │    │   RTSP Server    │    │   YOLO Detection│
│   (Next.js)     │◄───┤   (Node.js)      │◄───┤   (Python)      │
│   Port: 3000    │    │   Port: 8888     │    │   Background    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   HLS Streams    │    │   Detection API │
│   (PostgreSQL)  │    │   (FFmpeg)       │    │   (Real-time)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎯 **Next Steps After Startup**

1. **Add Cameras**: Use the web interface to add new cameras
2. **Configure Rules**: Set up safety detection rules
3. **Monitor Alerts**: View real-time alerts and detections
4. **Customize Detection**: Modify YOLO settings for your use case

## 📝 **Environment Variables**

Create `.env.local` in the `app` directory:
```env
DATABASE_URL="your_postgresql_url"
DIRECT_URL="your_direct_postgresql_url"
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3000"
```

## 🎉 **Success Indicators**

- ✅ Web app loads at `http://localhost:3000`
- ✅ Camera feeds display live video
- ✅ YOLO detection shows bounding boxes
- ✅ Alerts appear in real-time
- ✅ Database stores detection results

---

**🚀 You're now ready to run the complete Nexxau AI Detection system!**
