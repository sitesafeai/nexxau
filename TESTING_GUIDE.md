# 🧪 SiteSafe Testing Guide

Complete guide to test all implemented features.

---

## 📋 **PRE-REQUISITES**

✅ **Database seeded** with demo cameras (you just did this!)
✅ **Dev server running** on `http://localhost:3000`
✅ **Database connection** working

If dev server is not running:
```bash
cd /Users/luizcarneiro/nexxau/app
npm run dev
```

---

## 🎯 **FEATURE TESTING CHECKLIST**

### **1. ✅ CAMERA DATABASE PERSISTENCE**

**What to Test:**
- Cameras now persist across page refreshes
- No more localStorage, all data in PostgreSQL

**Steps:**
1. Navigate to `http://localhost:3000/dashboard`
2. Click on **"Cameras"** tab
3. **Verify**: You see 4 cameras:
   - People Detection Camera
   - Construction Zone Camera
   - Warehouse Monitoring
   - Parking Lot Camera

4. **Refresh the page** (Cmd+R)
5. **Verify**: Cameras are still there (not lost!)

6. Go to **"Camera Management"** page
7. Click **"Add Camera"** button
8. Fill in:
   - Name: `Test Camera 5`
   - Stream URL: `https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8`
   - Location: `Test Location`
9. Click **"Add Camera"**
10. **Verify**: New camera appears in list
11. **Refresh page**
12. **Verify**: Camera 5 is still there (persisted to database!)

---

### **2. ✅ CAMERA HEALTH MONITORING**

**What to Test:**
- Cameras show real-time health status
- "Last seen" timestamps
- Auto-offline detection after 5 minutes

**Steps:**
1. Go to `/dashboard` → **Cameras** tab
2. **Verify**: Each camera shows:
   - ✅ Status badge (online/offline/error)
   - 📍 Location
   - 🎥 Live video feed
   - ⏱️ "Last Activity" time

3. Open browser console (Cmd+Option+J)
4. Look for camera health updates (should see logs)

5. **To test offline detection:**
   - Wait 5 minutes without any camera activity
   - **OR** manually update in database:
   ```bash
   # Run this in a new terminal
   cd /Users/luizcarneiro/nexxau/app
   npx prisma studio
   # Go to CameraHealth table
   # Change lastCheck timestamp to 10 minutes ago
   # Refresh dashboard
   ```
   - **Verify**: Camera shows as "offline"

---

### **3. ✅ AI DETECTION (YOLO)**

**What to Test:**
- Real-time object detection on video streams
- Bounding boxes, labels, confidence scores
- FPS counter

**Steps:**
1. Go to `/dashboard` → **Monitoring** tab
2. **Verify**: You see all 4 cameras in a grid
3. **Watch for AI detection overlays:**
   - 🟢 Green boxes: People
   - 🟠 Orange boxes: Vehicles
   - 🔵 Blue boxes: Equipment
   - 🟣 Magenta boxes: Barriers

4. **Verify detection info displays:**
   - Object labels (e.g., "person", "car")
   - Confidence percentage (e.g., "94%")
   - FPS counter (top-right of video)
   - Detection count (e.g., "3 objects detected")

5. Click **"View Live"** on any camera
6. **Verify**: Opens full-screen modal with:
   - Larger video feed
   - AI detection still working
   - All detection data visible

**⚠️ Important Note:**
- Current detection uses **TensorFlow.js COCO-SSD**
- Detects generic objects (person, car, etc.)
- **NOT YET detecting PPE violations** (hardhat, safety vest)
- For production, need custom YOLO model

---

### **4. ✅ ALERT SYSTEM**

**What to Test:**
- View active alerts
- Alert details
- Alert filtering

**Steps:**
1. Go to `/dashboard` → **Alerts** tab
2. **Verify**: Alert table displays with columns:
   - ID
   - Type
   - Severity (color-coded)
   - Location
   - Time
   - Status

3. **Test filters:**
   - Change **"Status"** dropdown → Select "ACTIVE"
   - **Verify**: Only active alerts show
   - Change **"Severity"** dropdown → Select "HIGH"
   - **Verify**: Only high severity alerts show

4. Use **search box** → Type "hardhat"
5. **Verify**: Filters alerts by search term

---

### **5. ✅ ALERT STATE MANAGEMENT (API)**

**What to Test:**
- Acknowledge alerts
- Resolve alerts
- Escalate alerts

**Steps (Using Browser Console):**

**Test 1: Acknowledge Alert**
```javascript
// Open console (Cmd+Option+J)
// Find an alert ID from the dashboard
const alertId = 'YOUR_ALERT_ID_HERE'; // Replace with real ID

// Acknowledge the alert
fetch(`/api/alerts/${alertId}/acknowledge`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    userId: 'test-user',
    note: 'Investigating this issue'
  })
}).then(r => r.json()).then(console.log);

// Should see: { success: true, data: {...}, message: "Alert acknowledged successfully" }
```

**Test 2: Resolve Alert**
```javascript
fetch(`/api/alerts/${alertId}/resolve`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    userId: 'test-user',
    note: 'Issue resolved',
    resolution: 'Worker equipped with proper PPE'
  })
}).then(r => r.json()).then(console.log);

// Should see: { success: true, message: "Alert resolved successfully" }
```

**Test 3: Escalate Alert**
```javascript
fetch(`/api/alerts/${alertId}/escalate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    userId: 'test-user',
    note: 'Escalating to management',
    reason: 'Repeated violation',
    newSeverity: 'CRITICAL'
  })
}).then(r => r.json()).then(console.log);
```

**Test 4: Reopen Alert**
```javascript
// First resolve an alert, then reopen it
fetch(`/api/alerts/${alertId}/reopen`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    userId: 'test-user',
    note: 'Issue reoccurred',
    reason: 'Violation detected again'
  })
}).then(r => r.json()).then(console.log);
```

---

### **6. ✅ HEALTH CHECK ENDPOINT**

**What to Test:**
- System health monitoring
- Database status
- Camera status
- Memory usage

**Steps:**
1. Open new tab: `http://localhost:3000/api/health`
2. **Verify response includes:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T...",
  "uptime": 123.45,
  "checks": [
    {
      "service": "database",
      "status": "healthy",
      "message": "Database connection successful",
      "responseTime": 45
    },
    {
      "service": "cameras",
      "status": "healthy",
      "message": "4/4 cameras online",
      "details": {
        "total": 4,
        "online": 4,
        "offline": 0,
        "onlinePercentage": 100
      }
    },
    {
      "service": "alerts",
      "status": "healthy",
      "message": "X active alert(s)"
    },
    {
      "service": "memory",
      "status": "healthy",
      "message": "XXX MB / XXX MB (XX%)"
    }
  ],
  "summary": {
    "healthy": 4,
    "degraded": 0,
    "unhealthy": 0,
    "total": 4
  }
}
```

3. **Check HTTP status code:**
   - `200` = All healthy ✅
   - `207` = Some degraded ⚠️
   - `503` = Unhealthy ❌

---

### **7. ✅ STRUCTURED LOGGING**

**What to Test:**
- Console logs are structured
- Log levels work
- Context is included

**Steps:**
1. Open browser console (Cmd+Option+J)
2. Refresh dashboard
3. **Verify console logs show:**
```
[2025-10-21T10:30:00.000Z] INFO: Health check requested
[2025-10-21T10:30:00.050Z] INFO: Health check completed: healthy {"responseTime":50,"healthyCount":4}
[2025-10-21T10:30:01.000Z] DEBUG: Detected 3 objects {"cameraId":"cam-123"}
```

4. **Check server logs** (in terminal where `npm run dev` is running)
5. **Verify server logs show:**
   - API requests with status codes
   - Database queries
   - Camera activity
   - Health checks

---

### **8. ✅ RETRY LOGIC**

**What to Test:**
- Failed requests retry automatically
- Exponential backoff works

**Steps (Simulate in Console):**
```javascript
// Test API retry
async function testRetry() {
  try {
    // This will fail initially but should retry
    const response = await fetch('/api/cameras/invalid-id');
    console.log('Response:', response.status);
  } catch (error) {
    console.log('Failed after retries:', error);
  }
}

testRetry();
```

**In server logs, you should see:**
```
[WARN] Operation failed, retrying in 1000ms {"attempt":1}
[WARN] Operation failed, retrying in 2000ms {"attempt":2}
[ERROR] Operation failed after 3 attempts
```

---

### **9. ✅ GRACEFUL SHUTDOWN**

**What to Test:**
- Server shuts down cleanly
- Database connections close
- No data loss

**Steps:**
1. Go to terminal running `npm run dev`
2. Press **Ctrl+C** (SIGINT)
3. **Verify shutdown logs:**
```
[INFO] Received SIGINT signal (Ctrl+C)
[INFO] Starting graceful shutdown (signal: SIGINT)
[INFO] Closing database connections...
[INFO] Database connections closed
[INFO] Graceful shutdown completed successfully
```

4. **Restart server:** `npm run dev`
5. **Verify**: All cameras still in database (no data loss!)

---

### **10. ⚠️ REPORTS (MOCK DATA - Not Yet Real)**

**What to Test:**
- Report generation works
- Different report types
- Export formats

**Steps:**
1. Go to `/dashboard` → **Reports** tab
2. Click **"Export"** button on any report card
3. **Verify**: File downloads as CSV
4. Open CSV file
5. **Verify**: Contains mock data (this is expected for now)

**⚠️ Known Issue:**
- Reports currently use mock data
- Real database queries not implemented yet
- This is TODO #2 on our list

---

## 🐛 **TROUBLESHOOTING**

### **Problem: No cameras showing**
**Solution:**
```bash
cd /Users/luizcarneiro/nexxau/app
npx tsx scripts/seed-cameras.ts --force
# Restart dev server
```

### **Problem: Cameras show as offline**
**Solution:**
- Check if videos are playing
- Look for console errors
- Cameras auto-detect offline after 5 minutes of no activity
- Refresh the page to update health status

### **Problem: AI detection not working**
**Solution:**
- Check browser console for errors
- TensorFlow.js loads on first page load (may take 10-15 seconds)
- Look for "Model loaded successfully" in console
- Try refreshing the page
- Make sure video is playing

### **Problem: Database connection failed**
**Solution:**
```bash
# Check database URL
cat /Users/luizcarneiro/nexxau/app/.env | grep DATABASE_URL

# Regenerate Prisma client
cd /Users/luizcarneiro/nexxau/app
npx prisma generate

# Test connection
npx prisma studio
```

### **Problem: API returning 500 errors**
**Solution:**
- Check server logs in terminal
- Look for database errors
- Check Prisma schema is up to date: `npx prisma db push`

---

## 📊 **SUCCESS METRICS**

After testing, you should see:

✅ **4 cameras in database** (persisted)
✅ **All cameras showing as online** with green badges
✅ **Video feeds playing** in all camera views
✅ **AI detection overlays** with bounding boxes
✅ **FPS counter showing** (15-30 FPS)
✅ **Alerts displaying** in alerts tab
✅ **Health check returning 200** status
✅ **Console logs structured** with timestamps
✅ **No errors** in browser or server console

---

## 🚀 **NEXT STEPS AFTER TESTING**

1. **If everything works:**
   - Start using the system!
   - Add your own cameras via Camera Management
   - Monitor alerts
   - Test with real RTSP streams (if available)

2. **Before Production:**
   - Complete Alert Management UI
   - Replace mock report data with real queries
   - **CRITICAL**: Implement custom YOLO model for PPE detection

3. **Production Deployment:**
   - Set up proper environment variables
   - Configure external logging (Sentry/DataDog)
   - Set up monitoring alerts
   - Load testing with multiple cameras

---

## 📞 **NEED HELP?**

- Check browser console for errors
- Check server terminal for logs
- Look for ERROR level logs
- Test `/api/health` endpoint first
- Verify database has cameras: `npx prisma studio`

---

**🎉 Happy Testing!**

All the infrastructure is in place. The only missing piece for production is the custom YOLO model for actual PPE/safety violation detection!

