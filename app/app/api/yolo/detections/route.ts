import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbPool } from '../../../lib/database-pool';
import { broadcastDetection } from './stream/route';

// In-memory cache for recent detections (last 50 per camera)
const recentDetections = new Map<string, any[]>();

export async function POST(request: NextRequest) {
  try {
    const detectionData = await request.json();
    
    const {
      camera_id,
      timestamp,
      detections,
      frame_data,
      frame_width,
      frame_height
    } = detectionData;

    // Validate required fields
    if (!camera_id || !detections || !Array.isArray(detections)) {
      return NextResponse.json(
        { error: 'Missing required fields: camera_id, detections' },
        { status: 400 }
      );
    }

    const processedData = {
      cameraId: camera_id,
      timestamp: new Date(timestamp),
      detections: detections,
      frameData: frame_data,
      frameWidth: frame_width,
      frameHeight: frame_height,
      metadata: {
        detectionCount: detections.length,
        classes: detections.map(d => d.class_name),
        avgConfidence: detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
      }
    };

    // Store in memory cache for real-time access (non-blocking)
    if (!recentDetections.has(camera_id)) {
      recentDetections.set(camera_id, []);
    }
    
    const cameraDetections = recentDetections.get(camera_id)!;
    cameraDetections.push(processedData);
    
    // Keep only last 50 detections per camera
    if (cameraDetections.length > 50) {
      cameraDetections.shift();
    }

    // Broadcast to real-time stream immediately (non-blocking)
    try {
      broadcastDetection(camera_id, detections);
    } catch (error) {
      console.error('Error broadcasting detection:', error);
    }

    // Store in database asynchronously with retry logic (non-blocking)
    dbPool.executeWithRetry(
      () => prisma.detection.create({
        data: processedData
      })
    ).catch(console.error);

    // Check for safety violations asynchronously with retry logic (non-blocking)
    dbPool.executeWithRetry(
      () => checkSafetyViolations(camera_id, detections)
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Detection results processed successfully'
    });

  } catch (error) {
    console.error('Error processing detection results:', error);
    return NextResponse.json(
      { error: 'Failed to process detection results' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('camera_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Try to get from memory cache first (faster)
    if (cameraId && recentDetections.has(cameraId)) {
      const cachedDetections = recentDetections.get(cameraId)!;
      const limitedDetections = cachedDetections.slice(-limit).reverse();
      
      return NextResponse.json({
        success: true,
        detections: limitedDetections,
        count: limitedDetections.length,
        source: 'cache'
      });
    }

    // Fallback to database if not in cache with retry logic
    const where = cameraId ? { cameraId } : {};

    const detections = await dbPool.executeWithRetry(
      () => prisma.detection.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          camera: {
            select: {
              name: true,
              location: true
            }
          }
        }
      })
    );

    return NextResponse.json({
      success: true,
      detections,
      count: detections.length,
      source: 'database'
    });

  } catch (error) {
    console.error('Error fetching detections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detections' },
      { status: 500 }
    );
  }
}

async function checkSafetyViolations(cameraId: string, detections: any[]) {
  try {
    // Get active alert rules for this camera with retry logic
    const alertRules = await dbPool.executeWithRetry(
      () => prisma.alertRule.findMany({
        where: {
          isActive: true,
          targetType: 'CAMERA_SPECIFIC',
          targetCameras: {
            has: cameraId
          }
        }
      })
    );

    for (const rule of alertRules) {
      const violations = checkRuleViolations(rule, detections);
      
      if (violations.length > 0) {
        // Create alert for each violation with retry logic
        for (const violation of violations) {
          await dbPool.executeWithRetry(
            () => prisma.alert.create({
              data: {
                title: rule.name,
                description: `${rule.description} - ${violation.details}`,
                severity: rule.severity,
                source: 'AI_DETECTION',
                location: violation.location || 'Unknown',
                worksiteId: rule.worksiteId,
                metadata: {
                  cameraId,
                  ruleId: rule.id,
                  violation: violation,
                  detectionData: violation.detection
                }
              }
            })
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking safety violations:', error);
  }
}

function checkRuleViolations(rule: any, detections: any[]): any[] {
  const violations = [];
  
  // Simple rule checking logic - can be expanded
  switch (rule.category) {
    case 'PPE_COMPLIANCE':
      // Check for people without PPE
      const people = detections.filter(d => d.class_name === 'person');
      for (const person of people) {
        // This is a simplified check - in reality, you'd need PPE detection
        if (!hasPPE(person, detections)) {
          violations.push({
            type: 'PPE_VIOLATION',
            details: 'Person detected without proper PPE',
            location: `Camera ${rule.targetCameras?.[0]}`,
            detection: person
          });
        }
      }
      break;
      
    case 'VEHICLE_SAFETY':
      // Check for vehicles in restricted areas
      const vehicles = detections.filter(d => 
        ['car', 'truck', 'bus', 'motorcycle'].includes(d.class_name)
      );
      for (const vehicle of vehicles) {
        violations.push({
          type: 'VEHICLE_DETECTED',
          details: `${vehicle.class_name} detected in monitored area`,
          location: `Camera ${rule.targetCameras?.[0]}`,
          detection: vehicle
        });
      }
      break;
      
    case 'SITE_HAZARDS':
      // Check for people in restricted areas
      const peopleInRestricted = detections.filter(d => d.class_name === 'person');
      for (const person of peopleInRestricted) {
        violations.push({
          type: 'RESTRICTED_AREA_ACCESS',
          details: 'Person detected in restricted area',
          location: `Camera ${rule.targetCameras?.[0]}`,
          detection: person
        });
      }
      break;
  }
  
  return violations;
}

function hasPPE(person: any, detections: any[]): boolean {
  // Simplified PPE check - in reality, you'd need trained PPE detection
  // For now, we'll assume PPE is present if confidence is high
  return person.confidence > 0.8;
}
