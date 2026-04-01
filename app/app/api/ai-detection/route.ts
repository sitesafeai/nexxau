// API endpoint for AI Detection Service Integration
import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from '@/lib/error-handler';
import { aiDetectionIntegration } from '@/lib/ai-detection-integration';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const detectionData = await req.json();

    // Validate required fields
    if (!detectionData.camera_id && !detectionData.cameraId) {
      return NextResponse.json({ error: 'Missing required field: camera_id' }, { status: 400 });
    }

    if (!detectionData.detections && !detectionData.objects) {
      return NextResponse.json({ error: 'Missing required field: detections or objects' }, { status: 400 });
    }

    // Process the detection data
    await aiDetectionIntegration.processDetectionFromAI(detectionData);

    logger.info(`AI detection data processed successfully for camera ${detectionData.camera_id || detectionData.cameraId}`);

    return NextResponse.json({
      success: true,
      message: 'Detection data processed successfully',
      timestamp: new Date().toISOString(),
      cameraId: detectionData.camera_id || detectionData.cameraId,
      objectCount: (detectionData.detections || detectionData.objects || []).length
    });

  } catch (error: any) {
    logger.error('Error processing AI detection data:', error);
    return await errorHandler.handleError(error, req);
  }
}

export async function GET(req: NextRequest) {
  try {
    const stats = aiDetectionIntegration.getProcessingStats();
    
    return NextResponse.json({
      status: 'operational',
      processing: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error getting AI detection stats:', error);
    return await errorHandler.handleError(error, req);
  }
}
