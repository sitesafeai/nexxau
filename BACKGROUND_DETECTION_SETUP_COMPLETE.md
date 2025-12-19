# ✅ Background Detection Service - Setup Complete!

## 🎉 Service Status

Your background AI detection service is now **running** and will:
- ✅ Process camera feeds 24/7 (even when browser is closed)
- ✅ Detect objects using YOLO model
- ✅ Send detections to backend API
- ✅ Trigger alerts based on custom rules
- ✅ Auto-refresh camera list every 5 minutes

## 📊 Current Status

**Service:** ✅ Running  
**PID:** Check with `./manage_detection.sh status`  
**Logs:** `ai-detection/logs/detection.log`

## 🛠️ Management Commands

All commands should be run from the `ai-detection` directory:

```bash
cd /Users/luizcarneiro/nexxau/ai-detection
```

### Start Service
```bash
./manage_detection.sh start
```

### Stop Service
```bash
./manage_detection.sh stop
```

### Restart Service
```bash
./manage_detection.sh restart
```

### Check Status
```bash
./manage_detection.sh status
```

### View Logs (Live)
```bash
./manage_detection.sh logs
```

### View Logs (Last 50 lines)
```bash
tail -50 logs/detection.log
```

## 🔍 How It Works

1. **Service starts** → Loads YOLO model
2. **Fetches cameras** → From web app API or `cameras.json`
3. **Starts detection** → One thread per camera
4. **Processes frames** → Detects objects using YOLO
5. **Sends to backend** → POST to `/api/yolo/detections`
6. **Backend checks rules** → Creates alerts if rules match
7. **Refreshes config** → Every 5 minutes, checks for new cameras

## 📝 Current Configuration

- **Web App URL:** `http://localhost:3000`
- **Model:** `yolov8n.pt` (YOLOv8 nano - fast, generic detection)
- **Config Refresh:** Every 5 minutes
- **Log Location:** `ai-detection/logs/detection.log`

## ⚠️ Important Notes

### Camera Configuration

The service will:
1. **First try** to load from `cameras.json` (if exists)
2. **Then try** to fetch from web app API (`/api/cameras`)
3. **Auto-refresh** camera list every 5 minutes

### Current Issue

The service is running but trying to connect to **placeholder camera URLs** from `cameras.json`:
- `rtsp://username:password@camera_ip:554/stream1`

**To fix:**
1. **Option A:** Update `cameras.json` with real camera URLs
2. **Option B:** Add cameras via web app dashboard (service will auto-detect)
3. **Option C:** Delete `cameras.json` to force API fetch

### Model Selection

Currently using **YOLOv8n** (generic detection):
- ✅ Fast and lightweight
- ✅ Detects: person, car, truck, etc.
- ❌ Cannot detect: PPE violations (hardhat, safety vest)

**For production:** Train custom YOLO model for PPE detection (see `YOLO_TRAINING_GUIDE.md`)

## 🧪 Testing

### Test 1: Check if service is running
```bash
cd /Users/luizcarneiro/nexxau/ai-detection
./manage_detection.sh status
```

### Test 2: Check logs for activity
```bash
tail -f logs/detection.log
```

### Test 3: Verify detections are being sent
1. Open dashboard: `http://localhost:3000/dashboard`
2. Go to Alerts tab
3. You should see alerts being created (if cameras are connected and rules match)

### Test 4: Check backend API
```bash
# Check if detections endpoint is receiving data
curl http://localhost:3000/api/yolo/detections
```

## 🔄 Auto-Start on System Boot

### Option 1: Using launchd (macOS)

Create `/Users/luizcarneiro/Library/LaunchAgents/com.nexxau.detection.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nexxau.detection</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/luizcarneiro/nexxau/ai-detection/manage_detection.sh</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Users/luizcarneiro/nexxau/ai-detection</string>
    <key>StandardOutPath</key>
    <string>/Users/luizcarneiro/nexxau/ai-detection/logs/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/luizcarneiro/nexxau/ai-detection/logs/launchd.err.log</string>
</dict>
</plist>
```

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.nexxau.detection.plist
```

### Option 2: Using PM2 (if installed)

```bash
cd /Users/luizcarneiro/nexxau/ai-detection
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

## 📈 Monitoring

### Check Service Health
```bash
./manage_detection.sh status
```

### Monitor Logs in Real-Time
```bash
./manage_detection.sh logs
```

### Check for Errors
```bash
grep ERROR logs/detection.log | tail -20
```

### Check Camera Connections
```bash
grep "Failed to open stream" logs/detection.log | tail -10
```

## 🎯 Next Steps

1. **Add Real Cameras:**
   - Update `cameras.json` with real RTSP/HLS URLs
   - OR add cameras via web dashboard (service auto-detects)

2. **Train Custom YOLO Model:**
   - Follow `YOLO_TRAINING_GUIDE.md`
   - Replace `yolov8n.pt` with your trained model

3. **Create Custom Rules:**
   - Use web dashboard to create detection rules
   - Service will automatically check against them

4. **Set Up Auto-Start:**
   - Use launchd or PM2 to start on boot
   - Ensure service restarts if it crashes

## 🆘 Troubleshooting

### Service won't start
```bash
# Check Python dependencies
python3 -c "import cv2, ultralytics, requests"

# Check logs
cat logs/detection.log
```

### No cameras detected
```bash
# Check if web app is running
curl http://localhost:3000/api/health

# Check camera config
cat cameras.json
```

### Service stops unexpectedly
```bash
# Check for errors
grep -i error logs/detection.log

# Restart service
./manage_detection.sh restart
```

## ✅ Success Indicators

You'll know it's working when:
- ✅ Service status shows "running"
- ✅ Logs show "Active cameras: X/Y"
- ✅ Alerts appear in dashboard (if cameras connected)
- ✅ No errors in logs

---

**🎊 Your background detection service is ready!**

The service will now run 24/7 and process all your cameras, even when you close the browser.

