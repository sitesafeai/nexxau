import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbPool } from '@/app/lib/database-pool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const cameraId = searchParams.get('cameraId');

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where: any = {
      timestamp: {
        gte: startTime,
        lte: now,
      },
    };

    if (cameraId) {
      where.cameraId = cameraId;
    }

    // Get detection analytics with retry logic
    const [
      totalDetections,
      detectionsByClass,
      detectionsByCamera,
      detectionsByHour,
      averageConfidence
    ] = await Promise.all([
      // Total detections
      dbPool.executeWithRetry(
        () => prisma.detection.count({ where })
      ),
      
      // Detections by class
      dbPool.executeWithRetry(
        () => prisma.detection.findMany({
          where,
          select: { detections: true },
        })
      ).then(detections => {
        const classCount: Record<string, number> = {};
        detections.forEach(detection => {
          if (detection.detections && Array.isArray(detection.detections)) {
            detection.detections.forEach((d: any) => {
              const className = d.class_name || 'unknown';
              classCount[className] = (classCount[className] || 0) + 1;
            });
          }
        });
        return classCount;
      }),
      
      // Detections by camera
      dbPool.executeWithRetry(
        () => prisma.detection.groupBy({
          by: ['cameraId'],
          where,
          _count: { cameraId: true },
        })
      ).then(groups => {
        const cameraCount: Record<string, number> = {};
        groups.forEach(group => {
          cameraCount[group.cameraId] = group._count.cameraId;
        });
        return cameraCount;
      }),
      
      // Detections by hour
      dbPool.executeWithRetry(
        () => prisma.detection.findMany({
          where,
          select: { timestamp: true },
        })
      ).then(detections => {
        const hourCount: Record<number, number> = {};
        detections.forEach(detection => {
          const hour = new Date(detection.timestamp).getHours();
          hourCount[hour] = (hourCount[hour] || 0) + 1;
        });
        return hourCount;
      }),
      
      // Average confidence
      dbPool.executeWithRetry(
        () => prisma.detection.findMany({
          where,
          select: { detections: true },
        })
      ).then(detections => {
        let totalConfidence = 0;
        let confidenceCount = 0;
        
        detections.forEach(detection => {
          if (detection.detections && Array.isArray(detection.detections)) {
            detection.detections.forEach((d: any) => {
              if (d.confidence) {
                totalConfidence += d.confidence;
                confidenceCount++;
              }
            });
          }
        });
        
        return confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalDetections,
        detectionsByClass,
        detectionsByCamera,
        detectionsByHour,
        averageConfidence,
        timeRange,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Detection analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch detection analytics',
    }, { status: 500 });
  }
}
