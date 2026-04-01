import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/cloud-storage';

/**
 * GET /api/test-cloudinary
 * Test endpoint to verify Cloudinary is working
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Cloudinary connection...');
    
    // Create a simple test image (1x1 red pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    
    // Try to upload
    const result = await uploadFile(testImageBuffer, {
      folder: 'test-uploads',
      fileName: `test-${Date.now()}.png`,
      contentType: 'image/png',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Cloudinary test successful!', result);

    return NextResponse.json({
      success: true,
      message: '✅ Cloudinary is working!',
      result: {
        url: result.url,
        provider: result.provider,
        size: result.size
      },
      instructions: {
        viewImage: result.url,
        dashboard: `https://console.cloudinary.com/console/${process.env.CLOUDINARY_CLOUD_NAME}`,
        message: 'Check your Cloudinary dashboard to see the uploaded test image in the "test-uploads" folder'
      }
    });

  } catch (error: any) {
    console.error('❌ Cloudinary test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cloudinary test failed',
      details: error.message,
      troubleshooting: {
        checkEnvVars: 'Make sure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env',
        checkProvider: `Current provider: ${process.env.STORAGE_PROVIDER}`,
        checkCredentials: 'Verify credentials are correct from Cloudinary dashboard',
        restartServer: 'Restart your dev server after changing .env file'
      }
    }, { status: 500 });
  }
}

