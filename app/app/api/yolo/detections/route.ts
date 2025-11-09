import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbPool } from '../../../lib/database-pool';
import { broadcastDetection } from './stream/route';
import { 
  getWorksiteSettings, 
  filterDetectionsByConfidence, 
  shouldProcessDetection,
  checkViolationRateLimit
} from '../../../lib/worksite-settings';
import {
  checkZoneViolations,
  getCameraZones,
  getViolationDescription,
  type Detection as ZoneDetection
} from '../../../lib/zone-detection';
import { captureCameraClip } from '../../../lib/video-recorder';
import { uploadVideoClip } from '../../../lib/cloud-storage';
import { emitAlertCreated } from '../../../lib/alert-events';

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

    // Get camera and worksite settings
    const camera = await prisma.camera.findUnique({
      where: { id: camera_id },
      include: { worksite: true }
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Load worksite settings
    const settings = await getWorksiteSettings(camera.worksiteId);

    // Check if auto-detection is enabled
    if (!shouldProcessDetection(settings.camera.autoDetect)) {
      return NextResponse.json({
        success: true,
        message: 'Auto-detection disabled for this worksite',
        skipped: true
      });
    }

    // Filter detections by confidence threshold
    const filteredDetections = filterDetectionsByConfidence(
      detections,
      settings.camera.detectionConfidence
    );

    // If no detections pass the threshold, skip processing
    if (filteredDetections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No detections above confidence threshold',
        filtered: detections.length,
        threshold: settings.camera.detectionConfidence
      });
    }

    // Check for zone violations
    const cameraZones = getCameraZones(camera.metadata);
    let zoneViolations: any[] = [];
    
    if (cameraZones.length > 0) {
      // Convert filtered detections to zone detection format
      const zoneDetections: ZoneDetection[] = filteredDetections.map(d => ({
        class: d.class_name || d.class,
        score: d.confidence || d.conf || 0,
        bbox: d.bbox || [d.x || 0, d.y || 0, d.width || 0, d.height || 0]
      }));

      // Check zones
      zoneViolations = checkZoneViolations(
        zoneDetections,
        cameraZones,
        frame_width || 1920,
        frame_height || 1080
      );

      // Log zone violations
      if (zoneViolations.length > 0) {
        console.log(`🚨 Zone violations detected:`, {
          cameraId: camera_id,
          violations: zoneViolations.map(v => ({
            zone: v.zone.name,
            object: v.detection.class,
            severity: v.severity
          }))
        });

        for (const violation of zoneViolations) {
          dbPool.executeWithRetry(async () => {
            const baseMetadata = {
              type: 'zone_violation',
              cameraId: camera_id,
              cameraName: camera.name,
              zoneId: violation.zone.id,
              zoneName: violation.zone.name,
              zoneType: violation.zone.type,
              detectedObject: violation.detection.class,
              confidence: violation.detection.score,
              bbox: violation.detection.bbox,
              timestamp: new Date().toISOString(),
              frameWidth: frame_width,
              frameHeight: frame_height
            };

            let alert = await prisma.alert.create({
              data: {
                title: `Zone Violation: ${violation.zone.name}`,
                description: getViolationDescription(violation),
                severity: violation.severity,
                source: 'AI_DETECTION',
                location: `Camera: ${camera.name} - Zone: ${violation.zone.name}`,
                worksiteId: camera.worksiteId,
                status: 'ACTIVE',
                metadata: baseMetadata
              }
            });

            // Attempt to capture and upload video clip
            try {
              const clip = await captureCameraClip({
                id: camera.id,
                name: camera.name,
                streamUrl: camera.hlsUrl || camera.streamUrl || undefined,
              });
              if (clip) {
                const videoUrl = await uploadVideoClip(
                  clip.buffer,
                  alert.id,
                  camera_id,
                  { fileName: clip.filename }
                );

                alert = await prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    metadata: {
                      ...baseMetadata,
                      videoClipUrl: videoUrl
                    }
                  }
                });
              }
            } catch (error) {
              console.error('Failed to capture/upload video clip:', error);
            }

            const finalMetadata = (alert.metadata ?? baseMetadata) as Record<string, any>;

            emitAlertCreated({
              id: alert.id,
              title: alert.title,
              description: alert.description,
              severity: alert.severity,
              source: alert.source,
              location: alert.location,
              worksiteId: camera.worksiteId,
              status: alert.status,
              metadata: finalMetadata,
              createdAt: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt
            });

            return alert;
          }).catch(err => console.error('Error creating zone violation alert:', err));
        }
      }
    }

    const processedData = {
      cameraId: camera_id,
      timestamp: new Date(timestamp),
      detections: filteredDetections, // Use filtered detections
      frameData: frame_data,
      frameWidth: frame_width,
      frameHeight: frame_height,
      metadata: {
        detectionCount: filteredDetections.length,
        originalCount: detections.length,
        classes: filteredDetections.map(d => d.class_name || d.class),
        avgConfidence: filteredDetections.reduce((sum, d) => sum + (d.confidence || d.conf || 0), 0) / filteredDetections.length,
        confidenceThreshold: settings.camera.detectionConfidence
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
    // Use filtered detections and pass settings
    dbPool.executeWithRetry(
      () => checkSafetyViolations(camera_id, filteredDetections, camera.worksiteId, settings)
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

async function checkSafetyViolations(
  cameraId: string, 
  detections: any[], 
  worksiteId: string,
  settings: any
) {
  try {
    // Check violation rate limit before processing
    const withinRateLimit = await checkViolationRateLimit(
      worksiteId,
      settings.safety.maxViolationsPerHour
    );

    if (!withinRateLimit) {
      console.log(`Violation rate limit exceeded for worksite ${worksiteId}. Skipping violation checks.`);
      
      // If auto-escalate is enabled, create an escalation alert
      if (settings.safety.autoEscalate) {
        await dbPool.executeWithRetry(
          () => prisma.alert.create({
            data: {
              title: 'Violation Rate Limit Exceeded',
              description: `Maximum violations per hour (${settings.safety.maxViolationsPerHour}) exceeded. Auto-escalation triggered.`,
              severity: 'HIGH',
              source: 'SYSTEM',
              location: 'Worksite-wide',
              worksiteId: worksiteId,
              metadata: {
                type: 'rate_limit_exceeded',
                maxViolationsPerHour: settings.safety.maxViolationsPerHour,
                autoEscalated: true
              }
            }
          })
        );
      }
      return;
    }

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

    // Track violations to check against alert threshold
    let violationCount = 0;

    for (const rule of alertRules) {
      const violations = checkRuleViolations(rule, detections);
      
      if (violations.length > 0) {
        violationCount += violations.length;
        
        // Only create alerts if we've reached the alert threshold
        if (violationCount >= settings.camera.alertThreshold) {
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
                    detectionData: violation.detection,
                    alertThreshold: settings.camera.alertThreshold,
                    violationCount: violationCount
                  }
                }
              })
            );
          }
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
