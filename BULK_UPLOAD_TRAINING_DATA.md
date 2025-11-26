# Bulk Upload Training Data Guide

## Quick Start

### 1. Set up authentication token

Add to your `.env.local` file:
```bash
TRAINING_UPLOAD_TOKEN=your-secret-token-here
```

Generate a secure token (you can use any random string):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Get a Camera ID

You need a camera ID to associate training images. Options:

**Option A: Use existing camera**
- Go to `/dashboard/cameras` in your browser
- Copy any camera ID from the URL or database

**Option B: Create a training camera**
- Use Prisma Studio: `npx prisma studio`
- Or create via API/UI

**Option C: Use helper script**
```bash
node scripts/get-training-camera.js
```

### 3. Upload your dataset

Your dataset folder should have this structure:
```
safety.v1i.yolov8/
  ├── images/          (or train/images/, val/images/)
  │   ├── image1.jpg
  │   ├── image2.jpg
  │   └── ...
  └── labels/          (optional - for auto-categorization)
      ├── image1.txt
      ├── image2.txt
      └── ...
```

Run the upload script:
```bash
# Make sure you're in the project root
cd /Users/luizcarneiro/nexxau

# Upload from your dataset folder
node scripts/upload-training-data.js safety.v1i.yolov8 <cameraId> http://localhost:3002
```

### 4. Verify upload

- Go to `/dashboard/ai-training` in your browser
- You should see all uploaded images
- They'll be categorized based on YOLO labels (if provided)

## Dataset Folder Structure

The script automatically detects these folder structures:

- `dataset/images/` - Images in root
- `dataset/train/images/` - Training split
- `dataset/val/images/` - Validation split
- `dataset/test/images/` - Test split

Labels are optional but recommended:
- `dataset/labels/` or `dataset/train/labels/`
- YOLO format: `class_id x_center y_center width height` (normalized 0-1)

## Category Mapping

The script maps YOLO class IDs to categories:
- `0` → `hardhat`
- `1` → `vest`
- `2` → `person`
- `3` → `no-ppe`

You can customize this in `scripts/upload-training-data.js` (look for `categoryMap`).

## Troubleshooting

**Error: TRAINING_UPLOAD_TOKEN not set**
- Add the token to `.env.local` and restart your dev server

**Error: Camera not found**
- Make sure the cameraId exists in your database
- Check `/dashboard/cameras` to see available cameras

**Error: Forbidden (403)**
- Check that `TRAINING_UPLOAD_TOKEN` in `.env.local` matches what you're using
- Make sure your dev server is running

**Images not showing up**
- Check the browser console for errors
- Verify images were uploaded to Cloudinary (if configured)
- Check the database: `npx prisma studio` → `TrainingImage` table

## Next Steps

After uploading:
1. Review images in `/dashboard/ai-training`
2. Label any unlabeled images
3. Export dataset: Click "Export Dataset" button
4. Use exported JSON to train your YOLO model

