# Storage & AI Training Plan

## 📊 Cloud Storage Solutions

### Recommended Option: AWS S3 + CloudFront
**Best for: Enterprise-grade, scalable storage**

- **Training Images**: Store in S3 bucket `nexxau-ai-training`
- **Video Clips**: Store in S3 bucket `nexxau-video-clips`
- **Cost**: ~$0.023/GB storage, ~$0.09/GB transfer
- **Features**: Versioning, lifecycle policies, auto-deletion after X days

**Setup:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_TRAINING=nexxau-ai-training
AWS_S3_BUCKET_VIDEOS=nexxau-video-clips
```

---

### Alternative Option: Cloudinary
**Best for: Easy setup, built-in transformations**

- **Training Images**: Upload to Cloudinary with tags
- **Video Clips**: Auto-optimize and store videos
- **Cost**: Free tier (25GB storage, 25GB bandwidth/month)
- **Features**: Auto-optimization, transformations, CDN

**Setup:**
```bash
npm install cloudinary
```

**Environment Variables:**
```env
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

---

### Alternative Option: Supabase Storage
**Best for: Simple integration if using Supabase**

- **Training Images**: Store in `training-images` bucket
- **Video Clips**: Store in `incident-videos` bucket
- **Cost**: Free tier (1GB storage), then $0.021/GB
- **Features**: Built-in CDN, public/private buckets

---

## 🤖 AI Model Training Strategy

### 1. **YOLOv8 Custom Training**

**What You Need:**
- Training images: 500-2000+ labeled images
- Annotations: Bounding boxes in YOLO format
- Categories: Hardhat, Safety Vest, Person, Forklift, etc.

**Storage Structure:**
```
nexxau-ai-training/
├── images/
│   ├── train/     (80% of data)
│   ├── val/       (10% of data)
│   └── test/      (10% of data)
├── labels/        (YOLO format .txt files)
├── data.yaml      (Dataset configuration)
└── models/        (Trained model weights)
```

**Training Process:**
1. Collect images from your camera feeds
2. Label using tools like Roboflow, LabelImg, or CVAT
3. Export in YOLOv8 format
4. Train using Google Colab (free GPU) or local GPU
5. Deploy trained model to your app

**Recommended Tool: Roboflow**
- Auto-labeling assistance
- Cloud storage included
- Export to YOLOv8 format
- Free tier: 10,000 images

---

### 2. **Video Clip Storage**

**Database Schema (Already in Prisma):**
```prisma
model Alert {
  // ... existing fields
  metadata Json? // Store: { videoClipUrl: "s3://...", duration: 20 }
}
```

**Implementation Strategy:**
1. When infraction occurs:
   - Capture last 20 seconds from camera buffer
   - Upload to S3/Cloudinary
   - Store URL in Alert.metadata
   - Set lifecycle policy: auto-delete after 90 days

2. Video Retention Policies:
   - Critical alerts: 1 year
   - High alerts: 6 months
   - Medium alerts: 3 months
   - Low alerts: 30 days

---

## 💾 Recommended Cloud Storage Architecture

```
AWS S3 Buckets:
├── nexxau-ai-training/          (Private)
│   ├── datasets/
│   ├── models/
│   └── exports/
│
├── nexxau-video-clips/          (Private, auto-delete)
│   ├── {worksiteId}/
│   │   ├── {year}/{month}/{day}/
│   │   │   └── {alertId}-clip.mp4
│
└── nexxau-training-snapshots/   (Private)
    └── {cameraId}/
        └── {timestamp}.jpg
```

**Lifecycle Policies:**
- Training images: Never delete (archive to Glacier after 1 year)
- Video clips: Auto-delete based on severity
- Training snapshots: Keep latest 1000 per camera

---

## 🔧 Next Steps for Implementation

1. **Choose cloud provider** (AWS S3 recommended)
2. **Set up buckets** with proper permissions
3. **Install SDK** (`@aws-sdk/client-s3`)
4. **Create upload service** (`app/lib/cloud-storage.ts`)
5. **Update Alert creation** to capture & upload video
6. **Create training image collection** endpoint
7. **Set up model training pipeline**

---

## 💰 Cost Estimates (AWS S3)

**Assumptions:**
- 10 cameras × 8 hours/day × 30 days = 2,400 hours
- 1 infraction/hour = 2,400 clips/month
- 20 seconds × 5MB = 100MB per clip
- Total: ~240GB video/month

**Monthly Costs:**
- Storage: 240GB × $0.023 = $5.52
- Data transfer: 50GB × $0.09 = $4.50
- Requests: Minimal (~$0.50)
- **Total: ~$10-15/month**

**Training Images:**
- 2,000 images × 2MB = 4GB
- Cost: $0.10/month (one-time)

---

## 🎓 AI Training Resources

**Free GPU Training:**
- Google Colab (free tier: 12 hours/day)
- Kaggle Notebooks (30 hours/week GPU)

**Labeling Tools:**
- Roboflow (recommended) - Free tier
- LabelImg (open source)
- CVAT (open source)

**Pre-trained Models:**
- Start with YOLOv8 COCO weights
- Fine-tune on construction safety dataset
- Expected accuracy: 85-95% after 100+ epochs

---

## ✅ Action Items for Tomorrow

1. Set up AWS S3 bucket or Cloudinary account
2. Install cloud storage SDK
3. Create cloud storage service utility
4. Update alert creation to capture video clips
5. Implement video upload on infraction
6. Create training image collection endpoint
7. Begin collecting labeled training data

