// API endpoint for AI Detection Service Integration
import { NextResponse } from 'next/server';
import { withErrorHandler, AppError } from '@/app/lib/error-handler';
import { aiDetectionIntegration } from '@/app/lib/ai-detection-integration';
import { logInfo, logError } from '@/app/lib/logger';

export const POST = withErrorHandler(async (req: Request) => {
  try {
    const detectionData = await req.json();

    // Validate required fields
    if (!detectionData.camera_id && !detectionData.cameraId) {
      throw new AppError('Missing required field: camera_id', 400, 'low', 'validation');
    }

    if (!detectionData.detections && !detectionData.objects) {
      throw new AppError('Missing required field: detections or objects', 400, 'low', 'validation');
    }

    // Process the detection data
    await aiDetectionIntegration.processDetectionFromAI(detectionData);

    logInfo(`AI detection data processed successfully for camera ${detectionData.camera_id || detectionData.cameraId}`);

    return NextResponse.json({
      success: true,
      message: 'Detection data processed successfully',
      timestamp: new Date().toISOString(),
      cameraId: detectionData.camera_id || detectionData.cameraId,
      objectCount: (detectionData.detections || detectionData.objects || []).length
    });

  } catch (error) {
    logError('Error processing AI detection data:', error);
    throw error;
  }
});

export const GET = withErrorHandler(async (req: Request) => {
  try {
    const stats = aiDetectionIntegration.getProcessingStats();
    
    return NextResponse.json({
      status: 'operational',
      processing: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('Error getting AI detection stats:', error);
    throw error;
  }
});
