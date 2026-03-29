import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbPool } from '../../../lib/database-pool';
// broadcastDetection removed - not exported from stream/route
import {
  getWorksiteSettings,
  filterDetectionsByConfidence,
  shouldProcessDetection,
  checkViolationRateLimit,
  type WorksiteSettings,
} from '../../../lib/worksite-settings';
import {
  checkZoneViolations,
  getCameraZones,
  getViolationDescription,
  type Detection as ZoneDetection
} from '../../../lib/zone-detection';
import { emitAlertCreated } from '../../../lib/alert-events';
import { 
  FrameValidator, 
  // cameraWatchdog, // Removed - camera watchdog was deleted 
  AlertStateMachine,
  createAlertTransactionally 
} from '../../../lib/safety';
import { matchesRuleClass } from '../../../lib/detection-class-mapper';

// In-memory cache for recent detections (last 50 per camera)
const recentDetections = new Map<string, any[]>();

/** Hot cache for worksite settings (same path as getWorksiteSettings, shorter TTL for burst detections) */
const worksiteSettingsHotCache = new Map<string, { data: WorksiteSettings; expiresAt: number }>();
const WORKSITE_SETTINGS_HOT_TTL_MS = 120_000;

async function getCachedWorksiteSettings(worksiteId: string): Promise<WorksiteSettings> {
  const hit = worksiteSettingsHotCache.get(worksiteId);
  if (hit && Date.now() < hit.expiresAt) return hit.data;
  const settings = await getWorksiteSettings(worksiteId);
  worksiteSettingsHotCache.set(worksiteId, {
    data: settings,
    expiresAt: Date.now() + WORKSITE_SETTINGS_HOT_TTL_MS,
  });
  return settings;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();
  try {
    const detectionData = await request.json();
    const validationResult = FrameValidator.validateFrame(detectionData);

    if (!validationResult.isValid) {
      console.error(`[Detections API] Frame validation failed:`, validationResult.errors);
      return NextResponse.json(
        { error: 'Invalid frame data', errors: validationResult.errors, correlationId },
        { status: 400 }
      );
    }
    if (validationResult.warnings.length > 0) {
      console.warn(`[Detections API] Frame validation warnings:`, validationResult.warnings);
    }

    const sanitizedData = validationResult.sanitizedData!;
    const { camera_id, timestamp, detections, frame_data, frame_width, frame_height } = sanitizedData;

    const camera = await prisma.camera.findUnique({
      where: { id: camera_id },
      include: { worksite: true },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found', camera_id }, { status: 404 });
    }

    const settings = await getCachedWorksiteSettings(camera.worksiteId);

    if (!shouldProcessDetection(settings.camera.autoDetect)) {
      return NextResponse.json({
        success: true,
        message: 'Auto-detection disabled for this worksite',
        skipped: true,
        correlationId,
      });
    }

    const filteredDetections = filterDetectionsByConfidence(
      detections,
      settings.camera.detectionConfidence
    );

    if (filteredDetections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No detections above confidence threshold',
        skipped: true,
        reason: 'confidence_filter',
        filtered: detections.length,
        threshold: settings.camera.detectionConfidence,
        correlationId,
      });
    }

    const savedDetection = await prisma.detection.create({
      data: {
        cameraId: camera_id,
        timestamp: new Date(timestamp),
        detections: filteredDetections,
        frameData: frame_data,
        frameWidth: frame_width,
        frameHeight: frame_height,
        metadata: {
          confidence:
            filteredDetections.length > 0
              ? filteredDetections.reduce(
                  (max, d) => Math.max(max, d.score || d.confidence || d.conf || 0),
                  0
                )
              : 0,
          detectionCount: filteredDetections.length,
        },
      },
    });

    const cameraZones = getCameraZones(camera.metadata);
    let zoneViolations: any[] = [];

    if (cameraZones.length > 0) {
      const zoneDetections: ZoneDetection[] = filteredDetections.map((d) => ({
        class: d.class_name || d.class,
        score: d.confidence || d.conf || 0,
        bbox: d.bbox || [d.x || 0, d.y || 0, d.width || 0, d.height || 0],
      }));

      zoneViolations = checkZoneViolations(
        zoneDetections,
        cameraZones,
        frame_width || 1920,
        frame_height || 1080
      );

      if (zoneViolations.length > 0) {
        for (const violation of zoneViolations) {
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

          const shouldCreate = await AlertStateMachine.shouldCreateAlert(alertKey);
          if (!shouldCreate.shouldCreate) continue;

          dbPool
            .executeWithRetry(async () => {
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
                detectionId: savedDetection.id,
                alertKey,
                correlationId,
              };

              const alertResult = await createAlertTransactionally({
                alert: {
                  title: `Zone Violation: ${violation.zone.name}`,
                  description: getViolationDescription(violation),
                  severity: violation.severity,
                  source: 'AI_DETECTION',
                  location: `Camera: ${camera.name} - Zone: ${violation.zone.name}`,
                  status: 'ACTIVE',
                  metadata: baseMetadata,
                  camera: { connect: { id: camera_id } },
                  worksite: { connect: { id: camera.worksiteId } },
                },
                auditLog: {
                  action: 'ALERT_CREATED',
                  entity: 'ALERT',
                  entityName: `Zone Violation: ${violation.zone.name}`,
                  metadata: { ...baseMetadata, correlationId },
                  result: 'SUCCESS',
                  severity: violation.severity,
                  worksite: { connect: { id: camera.worksiteId } },
                },
              });

              if (!alertResult.success) throw new Error(alertResult.error || 'Failed to create alert');

              const alert = await prisma.alert.findUnique({
                where: { id: alertResult.alertId },
              });
              if (!alert) throw new Error('Alert not found');

              emitAlertCreated({
                id: alert.id,
                title: alert.title,
                description: alert.description,
                severity: alert.severity,
                source: alert.source,
                location: alert.location,
                worksiteId: camera.worksiteId,
                status: alert.status,
                metadata: (alert.metadata as Record<string, unknown>) || {},
                createdAt:
                  alert.createdAt instanceof Date
                    ? alert.createdAt.toISOString()
                    : String(alert.createdAt),
              });
              return alert;
            })
            .catch((err) => console.error(`[Detections API] Zone violation alert error:`, err));
        }
      }
    }

    // Person detected alert (no zone violation)
    let personAlertCreated = false;
    const hasPerson = filteredDetections.some(
      (d) => (d.class_name || d.class || '').toLowerCase() === 'person'
    );
    const personDetection =
      filteredDetections.find(
        (d) => (d.class_name || d.class || '').toLowerCase() === 'person'
      ) ?? filteredDetections[0];
    if (
      hasPerson &&
      zoneViolations.length === 0 &&
      (settings.camera.personDetectionAlertsEnabled ?? true)
    ) {
      const cooldownMs = (settings.camera.personDetectionCooldownMinutes ?? 5) * 60 * 1000;
      const bucketStart = new Date(Math.floor(Date.now() / cooldownMs) * cooldownMs);
      const alertKey = AlertStateMachine.generateAlertKey({
        cameraId: camera_id,
        violationType: 'person_detected',
        timestamp: bucketStart,
        location: camera.name,
        metadata: { type: 'person_detected' },
      });

      const shouldCreate = await AlertStateMachine.shouldCreateAlert(alertKey);
      if (shouldCreate.shouldCreate) {
        try {
          await dbPool.executeWithRetry(async () => {
            const personConfidence =
              (personDetection as any)?.score ?? (personDetection as any)?.confidence ?? 0.8;
            const baseMetadata = {
              type: 'person_detected',
              cameraId: camera_id,
              cameraName: camera.name,
              detectionId: savedDetection.id,
              personCount: filteredDetections.filter(
                (d) => (d.class_name || d.class || '').toLowerCase() === 'person'
              ).length,
              confidence: personConfidence,
              alertKey,
              correlationId,
              timestamp: new Date().toISOString(),
            };

            const alertResult = await createAlertTransactionally({
              alert: {
                title: 'Person detected',
                description: `Person detected on camera ${camera.name}`,
                severity: 'MEDIUM',
                source: 'AI_DETECTION',
                location: `Camera: ${camera.name}`,
                status: 'ACTIVE',
                metadata: baseMetadata,
                camera: { connect: { id: camera_id } },
                worksite: { connect: { id: camera.worksiteId } },
              },
              auditLog: {
                action: 'ALERT_CREATED',
                entity: 'ALERT',
                entityName: 'Person detected',
                metadata: { ...baseMetadata, correlationId },
                result: 'SUCCESS',
                severity: 'MEDIUM',
                worksite: { connect: { id: camera.worksiteId } },
              },
            });

            if (!alertResult.success) throw new Error(alertResult.error || 'Failed to create alert');

            const alert = await prisma.alert.findUnique({
              where: { id: alertResult.alertId },
              include: { worksite: true },
            });
            if (!alert) throw new Error('Alert not found');

            emitAlertCreated({
              id: alert.id,
              title: alert.title,
              description: alert.description,
              severity: alert.severity,
              source: alert.source,
              location: alert.location,
              worksiteId: camera.worksiteId,
              status: alert.status,
              metadata: (alert.metadata as Record<string, unknown>) || {},
              createdAt:
                alert.createdAt instanceof Date
                  ? alert.createdAt.toISOString()
                  : String(alert.createdAt),
            });
            // Email is sent from /api/cameras/snapshot after the snapshot is uploaded.
          });
          personAlertCreated = true;
        } catch (err) {
          console.error('[Detections API] Person-detected alert error:', err);
        }
      }
    }

    const processedData = {
      cameraId: camera_id,
      timestamp: new Date(timestamp),
      detections: filteredDetections,
      frameData: frame_data,
      frameWidth: frame_width,
      frameHeight: frame_height,
      metadata: {
        detectionCount: filteredDetections.length,
        originalCount: detections.length,
        classes: filteredDetections.map((d) => d.class_name || d.class),
        avgConfidence:
          filteredDetections.reduce(
            (sum, d) => sum + (d.confidence || d.conf || 0),
            0
          ) / filteredDetections.length,
        confidenceThreshold: settings.camera.detectionConfidence,
      },
    };

    if (!recentDetections.has(camera_id)) {
      recentDetections.set(camera_id, []);
    }
    const cameraDetections = recentDetections.get(camera_id)!;
    cameraDetections.push(processedData);
    if (cameraDetections.length > 50) cameraDetections.shift();

    dbPool
      .executeWithRetry(() =>
        checkSafetyViolations(
          camera_id,
          filteredDetections,
          camera.worksiteId,
          settings,
          camera
        )
      )
      .catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Detection results processed successfully',
      alertCreated: personAlertCreated,
      correlationId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    const latency = Date.now() - startTime;
    console.error(`[Detections API] Error:`, { error: err?.message, correlationId, latency });
    return NextResponse.json(
      { error: 'Failed to process detection results', correlationId, message: err?.message },
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

/** Map string severity to Prisma AlertSeverity (LOW | MEDIUM | HIGH) */
function mapSeverityToAlertSeverity(severity: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const s = (severity || '').toUpperCase();
  if (s === 'LOW' || s === 'INFO') return 'LOW';
  if (s === 'HIGH' || s === 'CRITICAL' || s === 'EMERGENCY') return 'HIGH';
  if (s === 'WARNING') return 'MEDIUM';
  return 'MEDIUM';
}

async function checkSafetyViolations(
  cameraId: string,
  detections: any[],
  worksiteId: string,
  settings: any,
  camera: { id: string; name: string }
) {
  try {
    const cooldownMs = 5 * 60 * 1000;
    const bucketStart = new Date(Math.floor(Date.now() / cooldownMs) * cooldownMs);

    // Check violation rate limit before processing
    const withinRateLimit = await checkViolationRateLimit(
      worksiteId,
      settings.safety.maxViolationsPerHour
    );

    if (!withinRateLimit) {
      console.log(`Violation rate limit exceeded for worksite ${worksiteId}. Skipping violation checks.`);

      if (settings.safety.autoEscalate) {
        await dbPool.executeWithRetry(
          () =>
            prisma.alert.create({
              data: {
                title: 'Violation Rate Limit Exceeded',
                description: `Maximum violations per hour (${settings.safety.maxViolationsPerHour}) exceeded. Auto-escalation triggered.`,
                severity: mapSeverityToAlertSeverity('WARNING'),
                source: 'SYSTEM',
                location: 'Worksite-wide',
                worksiteId: worksiteId,
                metadata: {
                  type: 'rate_limit_exceeded',
                  maxViolationsPerHour: settings.safety.maxViolationsPerHour,
                  autoEscalated: true,
                },
              },
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
            { cameraId: null }, // Applies to all cameras (cameraIds field doesn't exist)
            { cameraId: cameraId } // Applies to this specific camera (cameraIds field doesn't exist)
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

        if (violationCount >= settings.camera.alertThreshold) {
          for (const violation of violations) {
            const alertKey = AlertStateMachine.generateAlertKey({
              cameraId,
              violationType: `alert_rule_${rule.id}`,
              timestamp: bucketStart,
              location: violation.location || 'Unknown',
              metadata: { ruleId: rule.id },
            });

            const shouldCreate = await AlertStateMachine.shouldCreateAlert(alertKey);
            if (!shouldCreate.shouldCreate) continue;

            const alert = await dbPool.executeWithRetry(
              () =>
                prisma.alert.create({
                  data: {
                    title: rule.name,
                    description: `${rule.description} - ${violation.details}`,
                    severity: mapSeverityToAlertSeverity(rule.severity),
                    source: 'AI_DETECTION',
                    location: violation.location || `Camera: ${camera.name}`,
                    worksiteId: rule.worksiteId,
                    camera: { connect: { id: cameraId } },
                    metadata: {
                      cameraId,
                      ruleId: rule.id,
                      alertKey,
                      violation: violation,
                      detectionData: violation.detection,
                      alertThreshold: settings.camera.alertThreshold,
                      violationCount: violationCount,
                    },
                  },
                })
            );
            emitAlertCreated({
              id: alert.id,
              title: alert.title,
              description: alert.description,
              severity: alert.severity,
              source: alert.source,
              location: alert.location,
              worksiteId: alert.worksiteId || worksiteId,
              status: alert.status,
              metadata: (alert.metadata || {}) as Record<string, any>,
              createdAt: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt,
            });
          }
        }
      }
    }

    // Check custom rules
    for (const rule of customRules) {
      const violations = checkCustomRuleViolations(rule, detections, cameraId);

      if (violations.length > 0) {
        for (const violation of violations) {
          const alertKey = AlertStateMachine.generateAlertKey({
            cameraId,
            violationType: `custom_rule_${rule.id}`,
            timestamp: bucketStart,
            location: `Camera: ${camera.name}`,
            metadata: { ruleId: rule.id },
          });

          const shouldCreate = await AlertStateMachine.shouldCreateAlert(alertKey);
          if (!shouldCreate.shouldCreate) continue;

          const alert = await dbPool.executeWithRetry(
            () =>
              prisma.alert.create({
                data: {
                  title: rule.name,
                  description: rule.description || `${rule.name} triggered`,
                  severity: mapSeverityToAlertSeverity(rule.severity),
                  source: 'AI_DETECTION',
                  location: `Camera: ${camera.name}`,
                  worksiteId: rule.worksiteId,
                  ruleId: rule.id,
                  camera: { connect: { id: cameraId } },
                  metadata: {
                    cameraId,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    alertKey,
                    detectionType: (rule as any).detectionType || null,
                    objectClass: (rule as any).objectClass || null,
                    violation: violation,
                    detectionData: violation.detection,
                    timestamp: new Date().toISOString(),
                  },
                },
              })
          );
          emitAlertCreated({
            id: alert.id,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            source: alert.source,
            location: alert.location,
            worksiteId: alert.worksiteId || worksiteId,
            status: alert.status,
            metadata: (alert.metadata || {}) as Record<string, any>,
            createdAt: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt,
          });
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
