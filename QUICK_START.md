# 🚀 Nexxau AI Detection - Quick Start

## **One-Command Startup** ⚡

```bash
./start_all.sh
```

This will start all services:
- 🌐 **Web App** (http://localhost:3000)
- 🎥 **RTSP Server** (http://localhost:8888) 
- 🤖 **YOLO Detection** (Background)

## **Manual Startup** 🔧

### 1. Web Application
```bash
cd app
npm run dev
```

### 2. RTSP-to-HLS Server
```bash
cd rtsp-server
node rtsp-server.js
```

### 3. YOLO Detection
```bash
cd ai-detection
python3 detection_manager.py
```

## **What's Running** ✅

- **Live Video Streams**: People detection, Apple test streams
- **Real-time AI Detection**: YOLO v8 object detection
- **Web Dashboard**: Camera management, alerts, rules
- **HLS Conversion**: RTSP streams converted to web-playable format

## **Test It** 🧪

1. Open http://localhost:3000
2. Go to Dashboard → Cameras
3. Click "Add People Detection Camera"
4. Watch live detection with bounding boxes!

## **Stop Everything** 🛑

Press `Ctrl+C` in the terminal running `./start_all.sh`

---

**🎉 That's it! Your AI detection system is now running!**
