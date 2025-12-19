# 🚀 Quick Start: Background Detection Service

## ✅ Setup Complete!

Your background detection service is **running** and monitoring cameras 24/7.

## 📋 Quick Commands

```bash
cd /Users/luizcarneiro/nexxau/ai-detection

# Check status
./manage_detection.sh status

# View logs
./manage_detection.sh logs

# Restart service
./manage_detection.sh restart

# Stop service
./manage_detection.sh stop
```

## 🎯 What's Running

- ✅ **Background Detection Service** (PID: Check with status command)
- ✅ **YOLO Model:** yolov8n.pt (generic detection)
- ✅ **Web App:** http://localhost:3000
- ✅ **Auto-refresh:** Camera list every 5 minutes

## 📝 Next Steps

1. **Add Real Cameras:**
   - Update `ai-detection/cameras.json` with real RTSP URLs
   - OR add cameras via web dashboard (auto-detected)

2. **Check Alerts:**
   - Open dashboard → Alerts tab
   - Alerts will appear when rules match detections

3. **View Logs:**
   ```bash
   cd ai-detection
   tail -f logs/detection.log
   ```

## 🔍 Verify It's Working

```bash
# Check if service is running
cd /Users/luizcarneiro/nexxau/ai-detection
./manage_detection.sh status

# Should show:
# ✅ Service is running (PID: xxxxx)
```

## 📚 Full Documentation

See `BACKGROUND_DETECTION_SETUP_COMPLETE.md` for complete details.
