#!/usr/bin/env node

/**
 * Bulk upload training images from a YOLOv8 dataset folder
 * 
 * Usage:
 *   node scripts/upload-training-data.js <dataset-folder> [cameraId] [baseUrl]
 * 
 * Example:
 *   node scripts/upload-training-data.js safety.v1i.yolov8 cam_123 http://localhost:3002
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Load environment variables from .env.local
try {
  const envPath = path.join(__dirname, '..', 'app', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (err) {
  // Ignore if .env.local doesn't exist
}

// Parse command line arguments
const [,, datasetFolder, cameraId, baseUrl = 'http://localhost:3002'] = process.argv;

if (!datasetFolder) {
  console.error('❌ Error: Dataset folder path is required');
  console.log('\nUsage: node scripts/upload-training-data.js <dataset-folder> [cameraId] [baseUrl]');
  console.log('Example: node scripts/upload-training-data.js safety.v1i.yolov8 cam_123');
  process.exit(1);
}

// Check if folder exists
const datasetPath = path.resolve(datasetFolder);
if (!fs.existsSync(datasetPath)) {
  console.error(`❌ Error: Folder not found: ${datasetPath}`);
  process.exit(1);
}

// Find images folder (common YOLOv8 structures)
const possibleImagePaths = [
  path.join(datasetPath, 'images'),
  path.join(datasetPath, 'train', 'images'),
  path.join(datasetPath, 'val', 'images'),
  path.join(datasetPath, 'test', 'images'),
  datasetPath // fallback: assume images are in root
];

let imagesFolder = null;
for (const imgPath of possibleImagePaths) {
  if (fs.existsSync(imgPath) && fs.statSync(imgPath).isDirectory()) {
    const files = fs.readdirSync(imgPath).filter(f => 
      /\.(jpg|jpeg|png|bmp)$/i.test(f)
    );
    if (files.length > 0) {
      imagesFolder = imgPath;
      console.log(`✓ Found images folder: ${imgPath} (${files.length} images)`);
      break;
    }
  }
}

if (!imagesFolder) {
  console.error('❌ Error: No images folder found. Expected structure:');
  console.error('  - dataset/images/');
  console.error('  - dataset/train/images/');
  console.error('  - dataset/val/images/');
  process.exit(1);
}

// Find labels folder (optional)
const possibleLabelPaths = [
  path.join(datasetPath, 'labels'),
  path.join(datasetPath, 'train', 'labels'),
  path.join(datasetPath, 'val', 'labels'),
  path.join(datasetPath, 'test', 'labels'),
];

let labelsFolder = null;
for (const lblPath of possibleLabelPaths) {
  if (fs.existsSync(lblPath) && fs.statSync(lblPath).isDirectory()) {
    labelsFolder = lblPath;
    console.log(`✓ Found labels folder: ${lblPath}`);
    break;
  }
}

// Get all image files
const imageFiles = fs.readdirSync(imagesFolder)
  .filter(f => /\.(jpg|jpeg|png|bmp)$/i.test(f))
  .map(f => path.join(imagesFolder, f));

console.log(`\n📦 Found ${imageFiles.length} images to upload\n`);

// Category mapping (YOLO class IDs to category names)
// You can customize this based on your dataset
const categoryMap = {
  0: 'hardhat',
  1: 'vest',
  2: 'person',
  3: 'no-ppe',
  // Add more mappings as needed
};

// Parse YOLO label file to extract category
function parseYoloLabel(labelPath) {
  if (!fs.existsSync(labelPath)) return null;
  
  try {
    const content = fs.readFileSync(labelPath, 'utf-8').trim();
    if (!content) return null;
    
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    if (!firstLine) return null;
    
    const [classId] = firstLine.split(' ').map(Number);
    return categoryMap[classId] || `class-${classId}`;
  } catch (err) {
    return null;
  }
}

// Upload a single image
async function uploadImage(imagePath, cameraId) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).slice(1).toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/bmp';
    const imageData = `data:${mimeType};base64,${base64Image}`;
    
    // Try to find corresponding label file
    const imageName = path.basename(imagePath, path.extname(imagePath));
    let category = 'unlabeled';
    
    if (labelsFolder) {
      const labelPath = path.join(labelsFolder, `${imageName}.txt`);
      const parsedCategory = parseYoloLabel(labelPath);
      if (parsedCategory) {
        category = parsedCategory;
      }
    }
    
    // Get upload token from environment or .env file
    const uploadToken = process.env.TRAINING_UPLOAD_TOKEN;
    if (!uploadToken) {
      throw new Error('TRAINING_UPLOAD_TOKEN not set. Add it to .env.local or export it.');
    }
    
    const response = await fetch(`${baseUrl}/api/training/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uploadToken}`,
      },
      body: JSON.stringify({
        cameraId,
        imageData,
        category,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Main upload loop
async function uploadAll() {
  if (!cameraId) {
    console.error('❌ Error: cameraId is required');
    console.log('\nYou need to provide a cameraId. Get one from your database or create a dummy camera.');
    console.log('Example: node scripts/upload-training-data.js safety.v1i.yolov8 cam_123');
    process.exit(1);
  }
  
  console.log(`🚀 Starting upload to camera: ${cameraId}`);
  console.log(`📡 API endpoint: ${baseUrl}\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const fileName = path.basename(imagePath);
    const progress = `[${i + 1}/${imageFiles.length}]`;
    
    try {
      await uploadImage(imagePath, cameraId);
      successCount++;
      process.stdout.write(`\r${progress} ✓ ${fileName}`);
    } catch (error) {
      errorCount++;
      errors.push({ file: fileName, error: error.message });
      process.stdout.write(`\r${progress} ✗ ${fileName} - ${error.message}`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n📊 Upload Summary:');
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.slice(0, 10).forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
  
  console.log('\n✅ Done! Check your AI Training dashboard to see the uploaded images.');
}

// Run
uploadAll().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});

