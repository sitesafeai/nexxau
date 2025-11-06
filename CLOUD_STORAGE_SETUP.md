# Cloud Storage Setup Guide

## 🚀 Quick Start

Add these to your `.env` file based on your chosen provider:

### Option 1: AWS S3 (Recommended for Production)

```bash
# Storage Provider
STORAGE_PROVIDER="aws-s3"

# AWS Credentials
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_TRAINING="nexxau-ai-training"
AWS_S3_BUCKET_VIDEOS="nexxau-video-clips"
```

**Setup Steps:**
1. Go to AWS Console → S3
2. Create two buckets:
   - `nexxau-ai-training` (Private)
   - `nexxau-video-clips` (Private)
3. Go to IAM → Create access key
4. Add credentials to `.env`
5. Install SDK: `npm install @aws-sdk/client-s3`

**Cost:** ~$10-15/month for typical usage

---

### Option 2: Cloudinary (Easiest Setup)

```bash
# Storage Provider
STORAGE_PROVIDER="cloudinary"

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

**Setup Steps:**
1. Sign up at https://cloudinary.com (Free tier: 25GB)
2. Get credentials from Dashboard
3. Add to `.env`
4. Install SDK: `npm install cloudinary`

**Cost:** Free tier available (25GB storage + 25GB bandwidth/month)

---

### Option 3: Local Storage (Development Only)

```bash
# Storage Provider
STORAGE_PROVIDER="local"
```

**Note:** Only for development. Files stored in `public/storage/` directory.

---

## 📹 Video Clip Settings

Add these to your `.env` file:

```bash
VIDEO_CLIP_DURATION=20  # seconds
VIDEO_RETENTION_CRITICAL=365  # days
VIDEO_RETENTION_HIGH=180
VIDEO_RETENTION_MEDIUM=90
VIDEO_RETENTION_LOW=30
```

---

## 🤖 AI Training Settings

```bash
MIN_TRAINING_IMAGES=500
AUTO_CAPTURE_ENABLED=false
CAPTURE_INTERVAL_MINUTES=30
```

---

## ✅ Feature Flags

```bash
ENABLE_ZONE_DETECTION=true
ENABLE_AUTO_ALERTS=true
ENABLE_VIDEO_RECORDING=true
ENABLE_TRAINING_COLLECTION=true
```

---

## 📦 Installation Commands

### For AWS S3:
```bash
cd app
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### For Cloudinary:
```bash
cd app
npm install cloudinary
```

### For Supabase:
```bash
cd app
npm install @supabase/supabase-js
```

---

## 🧪 Testing

After setup, test with:
```bash
# Test video upload
curl -X POST http://localhost:3000/api/training/snapshots \
  -H "Content-Type: application/json" \
  -d '{"cameraId":"your-camera-id","category":"test"}'
```

---

## 📊 Current Implementation Status

✅ **Completed:**
- Cloud storage utility (`app/lib/cloud-storage.ts`)
- Multi-provider support (AWS S3, Cloudinary, Supabase, Local)
- Training image upload API (`/api/training/snapshots`)
- TrainingImage database model
- Video clip upload functions
- Provider-agnostic interface

⏳ **To Do:**
- Install cloud storage SDK (choose provider first)
- Configure environment variables
- Implement actual video capture from camera buffer
- Set up automatic video clip saving on alerts
- Create UI for training image collection

---

## 🎯 Next Steps

1. **Choose your provider** (Cloudinary recommended for easiest start)
2. **Install the SDK** (see installation commands above)
3. **Add environment variables** to `.env`
4. **Test the upload** using the API endpoint
5. **Enable video recording** in settings

