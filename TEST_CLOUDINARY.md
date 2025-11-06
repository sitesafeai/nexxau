# Test Cloudinary Setup

## ✅ Your Credentials Are Configured

```
Cloud Name: dvab4kk60
API Key: 724735947577635
API Secret: ✅ Configured
Provider: cloudinary
SDK Installed: ✅ v2.8.0
```

---

## 🧪 Test Methods

### Method 1: Browser Test (Recommended)

1. Wait for dev server to finish starting (~15 seconds)
2. Open in browser:
   ```
   http://localhost:3000/api/test-cloudinary
   ```
3. You should see a success message with an image URL

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Cloudinary is working!",
  "result": {
    "url": "https://res.cloudinary.com/dvab4kk60/image/upload/...",
    "provider": "cloudinary",
    "size": 95
  },
  "instructions": {
    "viewImage": "https://res.cloudinary.com/dvab4kk60/...",
    "dashboard": "https://console.cloudinary.com/console/dvab4kk60",
    "message": "Check your Cloudinary dashboard..."
  }
}
```

---

### Method 2: Check Cloudinary Dashboard

1. Go to: https://console.cloudinary.com/console/dvab4kk60
2. Login with your credentials
3. Click "Media Library" in sidebar
4. Look for `test-uploads` folder
5. You should see a test image if the API was called

---

### Method 3: Terminal Test

Wait ~30 seconds for server to fully start, then run:

```bash
curl http://localhost:3000/api/test-cloudinary
```

---

## ❌ If It Fails

### Check Environment Variables:
```bash
cd /Users/luizcarneiro/nexxau/app
cat .env | grep CLOUDINARY
```

Should show:
```
STORAGE_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="dvab4kk60"
CLOUDINARY_API_KEY="724735947577635"
CLOUDINARY_API_SECRET="hCCF8s-uNUna46djTonxd8a2fzM"
```

### Restart Server:
```bash
cd /Users/luizcarneiro/nexxau/app
pkill -f "next dev"
npm run dev
```

### Check Server Logs:
Look for:
- `🧪 Testing Cloudinary connection...`
- `✅ Cloudinary test successful!`

---

## 🎯 What Gets Tested

The test endpoint:
1. Creates a tiny test image (1x1 pixel)
2. Uploads to Cloudinary
3. Returns the URL
4. You can click the URL to see the image

---

## 📊 After Success

Once working, your app can:
- ✅ Upload 20-second video clips on alerts
- ✅ Store training images for AI
- ✅ No space used on your computer
- ✅ 25GB free storage
- ✅ Global CDN for fast access

---

## 🚀 Next: Real Usage

After testing, the upload functions are ready:
- `uploadVideoClip(buffer, alertId, cameraId)` - Save alert videos
- `uploadTrainingImage(buffer, cameraId, category)` - Save training data
- Automatic uploads on zone violations (already implemented!)

