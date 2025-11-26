#!/usr/bin/env node

/**
 * Get or create a camera ID for training data uploads
 * 
 * Usage:
 *   node scripts/get-training-camera.js
 */

// This is a simple helper - you can also just use any existing camera ID
// or create one manually in the database

console.log(`
📷 Training Camera Helper

To upload training data, you need a cameraId. Options:

1. Use an existing camera:
   - Go to /dashboard/cameras
   - Copy any camera ID
   - Use it in the upload script

2. Create a training camera via API:
   - POST to /api/cameras with:
     {
       "name": "Training Data Camera",
       "worksiteId": "<any-worksite-id>",
       "type": "training"
     }

3. Quick database query (if you have Prisma access):
   npx prisma studio
   Then look at the Camera table and copy any ID

Once you have a cameraId, run:
  node scripts/upload-training-data.js <dataset-folder> <cameraId>

Example:
  node scripts/upload-training-data.js safety.v1i.yolov8 cam_abc123
`);

