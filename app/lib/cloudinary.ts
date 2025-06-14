import { CldImage } from 'next-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({ 
    cloud_name: 'dvab4kk60', 
    api_key: '724735947577635', 
    api_secret: process.env.CLOUDINARY_API_SECRET // We'll store this in .env.local
});

export { cloudinary };

// Helper function to upload an image
export async function uploadImage(imageUrl: string, publicId: string) {
    try {
        const uploadResult = await cloudinary.uploader.upload(imageUrl, {
            public_id: publicId,
        });
        return uploadResult;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Helper function to get optimized URL
export function getOptimizedUrl(publicId: string, options = {}) {
    return cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto',
        ...options
    });
}

// Helper function to get transformed URL
export function getTransformedUrl(publicId: string, width: number, height: number) {
    return cloudinary.url(publicId, {
        crop: 'auto',
        gravity: 'auto',
        width,
        height,
    });
}

export const cloudinaryConfig = {
  cloud: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
};

export interface CloudinaryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function CloudinaryImage({
  src,
  alt,
  width = 1200,
  height = 630,
  className = '',
  priority = false,
}: CloudinaryImageProps) {
  return (
    <CldImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={90}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
} 