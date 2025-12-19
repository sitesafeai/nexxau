# Background Detection Setup Guide

## Current Situation

**Frontend Detection (Browser):**
- ✅ Runs when video feed is open
- ❌ Stops when you close the tab
- ❌ Only detects generic objects (COCO-SSD)

**Backend Python Service:**
- ✅ Can run 24/7 in background
- ✅ Uses custom YOLO model
- ✅ Detects specific PPE violations
- ⚠️ Needs to be started manually

## Setup Background Detection

### Option 1: Start Python Detection Service (Recommended)

```bash
# Navigate to AI detection directory
cd /Users/luizcarneiro/nexxau/ai-detection

# Start the detection manager (runs all cameras)
python3 detection_manager.py

# Or use the simple detection service
python3 start_detection.py
```

### Option 2: Run as Background Process

```bash
# Start in background
cd /Users/luizcarneiro/nexxau/ai-detection
nohup python3 detection_manager.py > detection.log 2>&1 &

# Check if it's running
ps aux | grep detection_manager

# View logs
tail -f detection.log
```

### Option 3: Use the Startup Script

```bash
# Use the provided startup script
./start-ai-cameras.sh
```

### Option 4: Run with PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start detection service
cd /Users/luizcarneiro/nexxau/ai-detection
pm2 start detection_manager.py --name "ai-detection" --interpreter python3

# Make it start on system boot
pm2 startup
pm2 save

# Check status
pm2 status

# View logs
pm2 logs ai-detection
```

## Verify Background Detection is Working

1. **Check if service is running:**
   ```bash
   ps aux | grep python3 | grep detection
   ```

2. **Check API endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Check for alerts in dashboard:**
   - Open dashboard
   - Go to Alerts tab
   - You should see alerts even when video feeds are closed

4. **Check logs:**
   ```bash
   tail -f /Users/luizcarneiro/nexxau/ai-detection/detector.log
   ```

## What Happens with Background Detection

✅ **24/7 Monitoring:**
- Detections run continuously
- Alerts are created automatically
- Works even when dashboard is closed

✅ **Better Detection:**
- Uses YOLO custom model (if configured)
- Detects specific PPE violations
- More accurate than COCO-SSD

✅ **Independent Operation:**
- Doesn't require browser to be open
- Runs on server/background
- Processes all cameras simultaneously

## Current Limitations

⚠️ **Frontend Detection:**
- Only runs when video feed is open
- Uses generic COCO-SSD model
- Good for testing, not for production

⚠️ **Backend Detection:**
- Needs to be started manually (unless using PM2/systemd)
- Requires Python environment set up
- Needs YOLO model file

## Recommended Setup for Production

1. **Use PM2 or systemd** to auto-start detection service
2. **Train custom YOLO model** for PPE detection
3. **Disable frontend detection** in production (optional)
4. **Monitor detection service** with health checks

## Quick Start Command

```bash
# One command to start everything
cd /Users/luizcarneiro/nexxau/ai-detection && \
python3 detection_manager.py > detection.log 2>&1 &
```

This will:
- Start detection for all cameras
- Run in background
- Log to `detection.log`
- Continue running even after terminal closes

