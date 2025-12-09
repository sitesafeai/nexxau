/**
 * Cloud Storage Service
 * Provider-agnostic interface for storing videos and training images
 * Supports: AWS S3, Cloudinary, Supabase Storage
 */

// Storage provider type
export type StorageProvider = 'aws-s3' | 'cloudinary' | 'supabase' | 'local';

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  metadata?: Record<string, any>;
  contentType?: string;
  public?: boolean;
  expiresIn?: number; // Auto-delete after X days
}

export interface UploadResult {
  url: string;
  publicId?: string;
  key?: string;
  size?: number;
  provider: StorageProvider;
}

/**
 * Get configured storage provider from environment
 */
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  return provider as StorageProvider;
}

/**
 * Upload a file to cloud storage
 * @param file - File buffer or base64 string
 * @param options - Upload options
 * @returns Upload result with URL
 */
export async function uploadFile(
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const provider = getStorageProvider();

  switch (provider) {
    case 'aws-s3':
      return uploadToS3(file, options);
    case 'cloudinary':
      return uploadToCloudinary(file, options);
    case 'supabase':
      return uploadToSupabase(file, options);
    case 'local':
    default:
      return uploadToLocal(file, options);
  }
}

/**
 * Upload video clip to cloud storage
 * @param videoBuffer - Video file buffer
 * @param alertId - Associated alert ID
 * @param cameraId - Camera ID
 * @returns URL to video
 */
export async function uploadVideoClip(
  videoBuffer: Buffer,
  alertId: string,
  cameraId: string,
  options: { fileName?: string; duration?: number } = {}
): Promise<string> {
  const result = await uploadFile(videoBuffer, {
    folder: `video-clips/${cameraId}`,
    fileName: options.fileName || `${alertId}-${Date.now()}.mp4`,
    contentType: 'video/mp4',
    metadata: {
      alertId,
      cameraId,
      type: 'alert-clip',
      duration: options.duration || Number(process.env.VIDEO_CLIP_DURATION || 20)
    },
    expiresIn: 90 // Auto-delete after 90 days
  });

  return result.url;
}

/**
 * Upload training image to cloud storage
 * @param imageBuffer - Image file buffer
 * @param cameraId - Camera ID
 * @param category - Image category (hardhat, vest, person, etc.)
 * @returns URL to image
 */
export async function uploadTrainingImage(
  imageBuffer: Buffer,
  cameraId: string,
  category?: string
): Promise<string> {
  const result = await uploadFile(imageBuffer, {
    folder: `training-images/${category || 'unlabeled'}`,
    fileName: `${cameraId}-${Date.now()}.jpg`,
    contentType: 'image/jpeg',
    metadata: {
      cameraId,
      category,
      type: 'training-image',
      labeled: false
    }
  });

  return result.url;
}

/**
 * Delete a file from cloud storage
 * @param url - File URL or key
 */
export async function deleteFile(url: string): Promise<void> {
  const provider = getStorageProvider();

  switch (provider) {
    case 'aws-s3':
      return deleteFromS3(url);
    case 'cloudinary':
      return deleteFromCloudinary(url);
    case 'supabase':
      return deleteFromSupabase(url);
    case 'local':
    default:
      return deleteFromLocal(url);
  }
}

// ============================================
// AWS S3 Implementation
// ============================================

async function uploadToS3(file: Buffer | string, options: UploadOptions): Promise<UploadResult> {
  // AWS S3 not configured - use local storage instead
  console.warn('AWS S3 not available. To use S3: 1) Create AWS account, 2) npm install @aws-sdk/client-s3, 3) Add AWS credentials to .env');
  return uploadToLocal(file, options);
  
  /* 
  // Uncomment and install @aws-sdk/client-s3 to enable S3:
  // npm install @aws-sdk/client-s3
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('AWS S3 not configured, falling back to local storage');
    return uploadToLocal(file, options);
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const bucket = options.folder?.includes('training') 
      ? process.env.AWS_S3_BUCKET_TRAINING 
      : process.env.AWS_S3_BUCKET_VIDEOS;

    const key = `${options.folder || 'uploads'}/${options.fileName || `file-${Date.now()}`}`;
    
    const buffer = typeof file === 'string' 
      ? Buffer.from(file, 'base64')
      : file;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: options.metadata || {},
      ...(options.expiresIn && {
        Tagging: `expiry-days=${options.expiresIn}`
      })
    });

    await s3Client.send(command);

    const url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return {
      url,
      key,
      size: buffer.length,
      provider: 'aws-s3'
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return uploadToLocal(file, options);
  }
  */
}

async function deleteFromS3(url: string): Promise<void> {
  // Implementation for S3 deletion
  console.log('Delete from S3:', url);
}

// ============================================
// Cloudinary Implementation
// ============================================

async function uploadToCloudinary(file: Buffer | string, options: UploadOptions): Promise<UploadResult> {
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.warn('Cloudinary not configured, falling back to local storage');
    return uploadToLocal(file, options);
  }

  try {
    const cloudinary = await import('cloudinary').catch(() => {
      console.error('Cloudinary SDK not installed. Run: npm install cloudinary');
      throw new Error('Cloudinary SDK not installed');
    });
    
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const base64Data = typeof file === 'string' 
      ? file 
      : file.toString('base64');

    // Determine resource type - PDFs and other documents are 'raw', videos are 'video', images are 'image'
    let resourceType: 'image' | 'video' | 'raw' = 'image';
    if (options.contentType?.includes('video')) {
      resourceType = 'video';
    } else if (options.contentType?.includes('pdf') || options.contentType?.includes('application/')) {
      resourceType = 'raw';
    }

    const uploadResponse = await cloudinary.v2.uploader.upload(
      `data:${options.contentType || 'image/jpeg'};base64,${base64Data}`,
      {
        folder: options.folder || 'uploads',
        public_id: options.fileName?.replace(/\.[^/.]+$/, ''), // Remove extension
        resource_type: resourceType,
        context: options.metadata,
        // Make billing documents publicly accessible
        access_mode: options.folder?.includes('billing') ? 'public' : undefined,
        ...(options.expiresIn && {
          // Cloudinary doesn't support auto-delete, would need to set up cron job
        })
      }
    );

    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      size: uploadResponse.bytes,
      provider: 'cloudinary'
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

async function deleteFromCloudinary(url: string): Promise<void> {
  // Implementation for Cloudinary deletion
  console.log('Delete from Cloudinary:', url);
}

// ============================================
// Supabase Storage Implementation
// ============================================

async function uploadToSupabase(file: Buffer | string, options: UploadOptions): Promise<UploadResult> {
  console.warn('Supabase storage not yet implemented, falling back to local storage');
  return uploadToLocal(file, options);
}

async function deleteFromSupabase(url: string): Promise<void> {
  console.log('Delete from Supabase:', url);
}

// ============================================
// Local Storage Implementation (Development)
// ============================================

async function uploadToLocal(file: Buffer | string, options: UploadOptions): Promise<UploadResult> {
  // For development, we'll simulate upload and return a mock URL
  // In production, you would save to public/uploads folder
  
  const fileName = options.fileName || `file-${Date.now()}`;
  const folder = options.folder || 'uploads';
  
  // Simulate storage
  const url = `/storage/${folder}/${fileName}`;
  
  console.log('📁 Local storage (development):', {
    url,
    size: typeof file === 'string' ? file.length : file.length,
    folder: options.folder
  });

  return {
    url,
    key: `${folder}/${fileName}`,
    size: typeof file === 'string' ? file.length : file.length,
    provider: 'local'
  };
}

async function deleteFromLocal(url: string): Promise<void> {
  console.log('Delete from local:', url);
}

/**
 * Get video clip buffer from camera stream
 * This is a placeholder - actual implementation would require
 * video stream buffering or recording
 */
export async function captureVideoClip(
  cameraId: string,
  durationSeconds: number = 20
): Promise<Buffer> {
  // TODO: Implement actual video capture from camera stream
  // For now, return empty buffer as placeholder
  console.log(`📹 Capturing ${durationSeconds}s video clip from camera ${cameraId}`);
  
  // In production, this would:
  // 1. Access the camera's video buffer
  // 2. Extract last N seconds
  // 3. Encode to MP4
  // 4. Return buffer
  
  return Buffer.from('video-placeholder');
}

/**
 * Get camera snapshot for training data
 */
export async function captureCameraSnapshot(cameraId: string): Promise<Buffer> {
  // TODO: Implement actual snapshot capture
  console.log(`📸 Capturing snapshot from camera ${cameraId}`);
  
  return Buffer.from('snapshot-placeholder');
}

