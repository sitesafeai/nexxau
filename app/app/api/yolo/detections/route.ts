import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbPool } from '../../../lib/database-pool';
// broadcastDetection removed - not exported from stream/route
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
import { 
  FrameValidator, 
  cameraWatchdog, 
  AlertStateMachine,
  createAlertTransactionally 
} from '../../../lib/safety';
import { matchesRuleClass } from '../../../lib/detection-class-mapper';

// In-memory cache for recent detections (last 50 per camera)
const recentDetections = new Map<string, any[]>();

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const detectionData = await request.json();
    
    // SAFETY: Validate frame as untrusted input
    const validationResult = FrameValidator.validateFrame(detectionData);
    
    if (!validationResult.isValid) {
      console.error(`[Detections API] Frame validation failed:`, validationResult.errors);
      return NextResponse.json(
        { 
          error: 'Invalid frame data',
          errors: validationResult.errors,
          correlationId 
        },
        { status: 400 }
      );
    }
    
    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn(`[Detections API] Frame validation warnings:`, validationResult.warnings);
    }
    
    // Use sanitized data
    const sanitizedData = validationResult.sanitizedData!;
    const {
      camera_id,
      timestamp,
      detections,
      frame_data,
      frame_width,
      frame_height
    } = sanitizedData;

    // SAFETY: Check camera watchdog - is camera healthy?
    if (cameraWatchdog.isCameraDisabled(camera_id)) {
      console.warn(`[Detections API] Camera ${camera_id} is disabled (circuit breaker open)`);
      return NextResponse.json(
        { 
          error: 'Camera is disabled',
          message: 'Camera has been automatically disabled due to persistent failures. Please re-enable manually.',
          correlationId 
        },
        { status: 503 }
      );
    }
    
    if (!cameraWatchdog.isCameraHealthy(camera_id)) {
      console.warn(`[Detections API] Camera ${camera_id} is degraded`);
      // Continue processing but log warning
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
      // SAFETY: Record valid frame even if no detections
      cameraWatchdog.recordValidFrame(camera_id, new Date(timestamp));
      
      return NextResponse.json({
        success: true,
        message: 'No detections above confidence threshold',
        filtered: detections.length,
        threshold: settings.camera.detectionConfidence,
        correlationId
      });
    }

    // SAFETY: Record valid frame
    cameraWatchdog.recordValidFrame(camera_id, new Date(timestamp));

    // Save detection to database first (so we can link alerts to it)
    const savedDetection = await prisma.detection.create({
      data: {
        cameraId: camera_id,
        timestamp: new Date(timestamp),
        detections: filteredDetections,
        frameData: frame_data,
        frameWidth: frame_width,
        frameHeight: frame_height,
        metadata: {
          confidence: filteredDetections.length > 0 
            ? filteredDetections.reduce((max, d) => Math.max(max, d.score || d.confidence || d.conf || 0), 0)
            : 0,
          detectionCount: filteredDetections.length,
        },
      },
    });

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
          // SAFETY: Generate deterministic alert key for deduplication
          const alertKey = AlertStateMachine.generateAlertKey({
            cameraId: camera_id,
            violationType: `zone_violation_${violation.zone.id}`,
            timestamp: new Date(timestamp),
            location: violation.zone.name,
            metadata: {
              zoneType: violation.zone.type,
              detectedObject: violation.detection.class,
            },
          });
          
          // SAFETY: Check if alert should be created (deduplication)
          const shouldCreate = await AlertStateMachine.shouldCreateAlert(alertKey);
          
          if (!shouldCreate.shouldCreate) {
            console.log(`[Detections API] Skipping duplicate alert: ${shouldCreate.reason}`, {
              alertKey,
              existingAlertId: shouldCreate.existingAlertId,
              correlationId,
            });
            continue;
          }
          
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
              frameHeight: frame_height,
              detectionId: savedDetection.id, // Link alert to detection for feedback
              alertKey, // Store for deduplication
              correlationId,
            };

            // SAFETY: Create alert transactionally (alert + video + audit log)
            const alertResult = await createAlertTransactionally({
              alert: {
                title: `Zone Violation: ${violation.zone.name}`,
                description: getViolationDescription(violation),
                severity: violation.severity,
                source: 'AI_DETECTION',
                location: `Camera: ${camera.name} - Zone: ${violation.zone.name}`,
                worksiteId: camera.worksiteId,
                status: 'CREATED', // Use state machine state
                metadata: baseMetadata,
                worksite: {
                  connect: { id: camera.worksiteId },
                },
              },
              auditLog: {
                action: 'ALERT_CREATED',
                entity: 'ALERT',
                entityName: `Zone Violation: ${violation.zone.name}`,
                metadata: {
                  ...baseMetadata,
                  correlationId,
                },
                result: 'SUCCESS',
                severity: violation.severity,
                worksiteId: camera.worksiteId,
              },
            });
            
            if (!alertResult.success) {
              throw new Error(alertResult.error || 'Failed to create alert transactionally');
            }
            
            let alert = await prisma.alert.findUnique({
              where: { id: alertResult.alertId },
            });
            
            if (!alert) {
              throw new Error('Alert not found after creation');
            }

            // Attempt to capture and upload video clip (non-blocking)
            // SAFETY: Don't let video capture failure block alert creation
            captureCameraClip({
                id: camera.id,
                name: camera.name,
                streamUrl: camera.hlsUrl || camera.streamUrl || undefined,
            })
              .then(async (clip) => {
              if (clip) {
                  try {
                const videoUrl = await uploadVideoClip(
                  clip.buffer,
                  alert.id,
                  camera_id,
                  { fileName: clip.filename }
                );

                    await prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    metadata: {
                          ...(alert.metadata as Record<string, any> || {}),
                      videoClipUrl: videoUrl
                    }
                  }
                });
                  } catch (error) {
                    console.error(`[Detections API] Failed to upload video clip for alert ${alert.id}:`, error);
                    // Don't throw - video is optional
              }
            }
              })
              .catch((error) => {
                console.error(`[Detections API] Failed to capture video clip for alert ${alert.id}:`, error);
                // Don't throw - video is optional
              });

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
          }).catch(err => {
            console.error(`[Detections API] Error creating zone violation alert:`, err);
            // SAFETY: Record failure to watchdog
            cameraWatchdog.recordFailedFrame(camera_id, `Alert creation failed: ${err.message}`);
          });
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
      // broadcastDetection removed - function not exported from stream/route
      // TODO: Implement WebSocket broadcasting if needed
    } catch (error) {
      console.error('Error broadcasting detection:', error);
    }

    // Detection already saved above, no need to save again

    // Check for safety violations asynchronously with retry logic (non-blocking)
    // Use filtered detections and pass settings
    dbPool.executeWithRetry(
      () => checkSafetyViolations(camera_id, filteredDetections, camera.worksiteId, settings)
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Detection results processed successfully'
    });

  } catch (error: any) {
    // SAFETY: Record failure to watchdog if we have camera_id
    const cameraId = (detectionData as any)?.camera_id;
    if (cameraId) {
      cameraWatchdog.recordFailedFrame(
        cameraId, 
        `Detection processing failed: ${error?.message || 'Unknown error'}`
      );
    }
    
    const latency = Date.now() - startTime;
    console.error(`[Detections API] Error processing detection results:`, {
      error: error?.message || 'Unknown error',
      correlationId,
      latency,
      cameraId,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process detection results',
        correlationId,
        message: error?.message || 'Internal server error'
      },
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

    // Get active custom rules for this worksite
    const customRules = await dbPool.executeWithRetry(
      () => prisma.customRule.findMany({
        where: {
          isActive: true,
          worksiteId: worksiteId,
          // Check if rule applies to this camera (all cameras or specific camera)
          OR: [
            { cameraIds: { isEmpty: true } }, // Applies to all cameras
            { cameraIds: { has: cameraId } } // Applies to this specific camera
          ]
        }
      })
    );

    // Track violations to check against alert threshold
    let violationCount = 0;

    // Check alert rules
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

    // Check custom rules
    for (const rule of customRules) {
      const violations = checkCustomRuleViolations(rule, detections, cameraId);
      
      if (violations.length > 0) {
        for (const violation of violations) {
          // Create alert for custom rule violation
          await dbPool.executeWithRetry(
            () => prisma.alert.create({
              data: {
                title: rule.name,
                description: rule.description || `${rule.name} triggered`,
                severity: rule.severity,
                source: 'AI_DETECTION',
                location: `Camera: ${cameraId}`,
                worksiteId: rule.worksiteId,
                ruleId: rule.id,
                metadata: {
                  cameraId,
                  ruleId: rule.id,
                  ruleName: rule.name,
                  detectionType: rule.detectionType,
                  objectClass: rule.objectClass,
                  violation: violation,
                  detectionData: violation.detection,
                  timestamp: new Date().toISOString()
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

function checkCustomRuleViolations(rule: any, detections: any[], cameraId: string): any[] {
  const violations = [];
  
  // Check if rule matches detection type
  const detectionType = rule.detectionType;
  const objectClass = rule.objectClass;
  const minConfidence = rule.minConfidence || 0.5;
  
  // Filter detections by confidence
  const confidentDetections = detections.filter(d => 
    (d.confidence || d.score || 0) >= minConfidence
  );
  
  // Get detected class names
  const detectedClasses = confidentDetections.map(d => 
    (d.class_name || d.class || '').toLowerCase()
  );
  
  // Check different detection types
  switch (detectionType) {
    case 'object_present':
      // Check if the specified object is detected
      // Uses class mapper to support both COCO-SSD and YOLO classes
      if (objectClass) {
        const matchingDetections = confidentDetections.filter(d => {
          const detectedClass = (d.class_name || d.class || '').toLowerCase();
          return matchesRuleClass(detectedClass, objectClass);
        });
        
        for (const detection of matchingDetections) {
          violations.push({
            type: 'CUSTOM_RULE_VIOLATION',
            details: `${objectClass} detected (rule: ${rule.name})`,
            location: `Camera: ${cameraId}`,
            detection: detection
          });
        }
      }
      break;
      
    case 'object_missing':
      // Check if required object is missing (e.g., person without hardhat)
      // Works with both COCO (generic "person") and YOLO (specific "person_without_hardhat")
      if (objectClass) {
        // Check if person is detected (either generic "person" or any person_* class)
        const personDetections = confidentDetections.filter(d => {
          const detectedClass = (d.class_name || d.class || '').toLowerCase();
          return detectedClass === 'person' || detectedClass.startsWith('person_');
        });
        
        if (personDetections.length > 0) {
          // Check if the required object is missing
          // For YOLO: Check if "person_without_hardhat" is detected when rule wants "person_with_hardhat"
          // For COCO: Check if person is detected but required PPE class is not
          const hasRequiredObject = confidentDetections.some(d => {
            const detectedClass = (d.class_name || d.class || '').toLowerCase();
            return matchesRuleClass(detectedClass, objectClass);
          });
          
          if (!hasRequiredObject) {
            for (const detection of personDetections) {
              violations.push({
                type: 'CUSTOM_RULE_VIOLATION',
                details: `Person detected without ${objectClass} (rule: ${rule.name})`,
                location: `Camera: ${cameraId}`,
                detection: detection
              });
            }
          }
        }
      }
      break;
      
    case 'zone_violation':
      // Zone violations are handled separately in the zone detection logic
      // This is just a placeholder
      break;
  }
  
  return violations;
}

function hasPPE(person: any, detections: any[]): boolean {
  // Simplified PPE check - in reality, you'd need trained PPE detection
  // For now, we'll assume PPE is present if confidence is high
  return person.confidence > 0.8;
}
