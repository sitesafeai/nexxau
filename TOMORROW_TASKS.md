# Tasks for Tomorrow

## 🎯 High Priority

### 1. **Make Zone Detection Functional**
   - [ ] Update `app/api/yolo/detections/route.ts` to check if detected objects are inside restricted zones
   - [ ] Add zone boundary checking algorithm (point-in-polygon)
   - [ ] Trigger alerts when objects enter restricted zones
   - [ ] Connect to notification system for zone violations
   - [ ] Test with real camera feeds

**Files to modify:**
- `app/app/api/yolo/detections/route.ts`
- `app/app/lib/zone-detection.ts` (NEW - create utility)

---

### 2. **Alert Rules Management Page**
   - [ ] Add "Alert Rules" link to sidebar menu in `app/dashboard/page.tsx`
   - [ ] Verify `app/dashboard/alert-rules/page.tsx` loads real rules from database
   - [ ] Test filtering by worksite
   - [ ] Ensure edit/delete functionality works

**Files to check:**
- `app/app/dashboard/alert-rules/page.tsx` (Already created ✅)
- `app/app/dashboard/page.tsx` (Add sidebar link)

---

### 3. **Filter Cameras by Worksite**
   - [ ] Update camera loading in alert-builder to filter by worksite
   - [ ] Remove demo/hardcoded cameras
   - [ ] Only show cameras from current worksite

**Files to modify:**
- `app/app/dashboard/alert-builder/page.tsx`
- Check `useCameraStore()` hook implementation

---

## 🚀 Medium Priority

### 4. **Cloud Storage Setup**
   - [ ] Choose cloud provider (AWS S3 recommended, or Cloudinary for easier setup)
   - [ ] Create buckets/containers for:
     - Training images (`nexxau-ai-training`)
     - Video clips (`nexxau-video-clips`)
   - [ ] Install SDK: `npm install @aws-sdk/client-s3` or `npm install cloudinary`
   - [ ] Add environment variables to `.env`

---

### 5. **Video Clip Storage Implementation**
   - [ ] Create `app/lib/cloud-storage.ts` utility
   - [ ] Implement video upload function
   - [ ] Update alert creation to capture 20-second clips
   - [ ] Store video URLs in `Alert.metadata.videoClipUrl`
   - [ ] Implement lifecycle/retention policies

**Pseudocode:**
```typescript
// When alert is created:
1. Get last 20 seconds of video from camera buffer
2. Upload to S3: await uploadVideoClip(videoBuffer, alertId)
3. Store URL in alert.metadata.videoClipUrl
4. Set auto-delete after X days based on severity
```

---

### 6. **AI Training Data Collection**
   - [ ] Create endpoint to save training snapshots: `POST /api/training/snapshots`
   - [ ] Add "Save for Training" button on camera feeds
   - [ ] Upload snapshots to cloud storage
   - [ ] Create database table to track training images

**New Prisma Model:**
```prisma
model TrainingImage {
  id          String   @id @default(cuid())
  imageUrl    String   // S3/Cloudinary URL
  cameraId    String
  labeled     Boolean  @default(false)
  annotations Json?    // Bounding boxes when labeled
  category    String?  // hardhat, vest, person, etc.
  createdAt   DateTime @default(now())
}
```

---

## 📝 Notes

### Cloud Storage Recommendations:
- **AWS S3**: Best for scalability, ~$10-15/month for video clips
- **Cloudinary**: Easier setup, free tier available (25GB)
- **Supabase Storage**: Good if already using Supabase

### Video Storage Strategy:
- Store actual video files in cloud (S3/Cloudinary)
- Store metadata + URLs in PostgreSQL
- Use pre-signed URLs for secure access
- Auto-delete based on retention policy

### AI Training:
- Need 500-2,000+ labeled images for good accuracy
- Use Roboflow for labeling (free tier)
- Train on Google Colab (free GPU)
- Expected: 2-4 weeks to collect data + 1 day to train

---

## ✅ Completed Today

- ✅ Removed Color Key and AI Active overlays from video feeds
- ✅ Fixed infinite loop in dashboard
- ✅ Enhanced Safety Analytics & Insights report page
- ✅ Created Alert Rules viewer page
- ✅ Created Camera Zones drawing tool (fully functional!)
- ✅ Fixed zone drawing click detection
- ✅ Changed minimum zone points to 4
- ✅ Enabled multi-zone creation
- ✅ Fixed multiple API errors
- ✅ Fixed AcknowledgeAlertModal variable conflict
- ✅ Fixed cameras.map error

