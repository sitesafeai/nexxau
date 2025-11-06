/**
 * Zone Detection Utility
 * Handles point-in-polygon detection for restricted zones
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;      // Top-left x
  y: number;      // Top-left y
  width: number;
  height: number;
}

export interface DetectionZone {
  id: string;
  name: string;
  type: 'restricted' | 'required' | 'monitored';
  points: Point[];  // Polygon vertices
  color: string;
  objectTriggers?: string[]; // Which object classes trigger this zone
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * @param point - The point to check
 * @param polygon - Array of polygon vertices
 * @returns true if point is inside polygon
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a bounding box overlaps with a polygon zone
 * Tests all 4 corners and the center point of the bounding box
 * @param bbox - Bounding box to check
 * @param zone - Detection zone polygon
 * @returns true if any part of the bbox is inside the zone
 */
export function isBoundingBoxInZone(bbox: BoundingBox, zone: DetectionZone): boolean {
  if (zone.points.length < 3) return false;

  // Convert zone points from percentage to absolute coordinates if needed
  const zonePoints = zone.points;

  // Test all 4 corners and center of bounding box
  const testPoints: Point[] = [
    // Top-left
    { x: bbox.x, y: bbox.y },
    // Top-right
    { x: bbox.x + bbox.width, y: bbox.y },
    // Bottom-left
    { x: bbox.x, y: bbox.y + bbox.height },
    // Bottom-right
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    // Center
    { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }
  ];

  // If any point is inside the zone, the bbox overlaps
  return testPoints.some(point => isPointInPolygon(point, zonePoints));
}

/**
 * Check all detections against all zones for a camera
 * @param detections - Array of detection objects with bboxes
 * @param zones - Array of detection zones
 * @param frameWidth - Video frame width
 * @param frameHeight - Video frame height
 * @returns Array of zone violations
 */
export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface ZoneViolation {
  zone: DetectionZone;
  detection: Detection;
  violationType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function checkZoneViolations(
  detections: Detection[],
  zones: DetectionZone[],
  frameWidth: number,
  frameHeight: number
): ZoneViolation[] {
  const violations: ZoneViolation[] = [];

  // Check each detection against each zone
  for (const detection of detections) {
    const [x, y, width, height] = detection.bbox;
    
    const bbox: BoundingBox = {
      x,
      y,
      width,
      height
    };

    for (const zone of zones) {
      // Convert zone points from percentage (0-100) to absolute coordinates
      const absoluteZonePoints = zone.points.map(p => ({
        x: (p.x / 100) * frameWidth,
        y: (p.y / 100) * frameHeight
      }));

      const zoneWithAbsolutePoints: DetectionZone = {
        ...zone,
        points: absoluteZonePoints
      };

      // Check if detection is in this zone
      if (isBoundingBoxInZone(bbox, zoneWithAbsolutePoints)) {
        // Check if this object class triggers this zone
        const shouldTrigger = !zone.objectTriggers || 
                             zone.objectTriggers.length === 0 ||
                             zone.objectTriggers.includes(detection.class);

        if (shouldTrigger) {
          // Determine severity based on zone type
          let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
          
          if (zone.type === 'restricted') {
            severity = 'HIGH'; // Restricted zones are high severity
          } else if (zone.type === 'monitored') {
            severity = 'LOW'; // Monitored zones are informational
          } else if (zone.type === 'required') {
            severity = 'MEDIUM'; // Required zones (e.g., PPE required)
          }

          violations.push({
            zone,
            detection,
            violationType: `${detection.class}_in_${zone.type}_zone`,
            severity
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Get camera zones from camera metadata
 * @param cameraMetadata - Camera metadata object
 * @returns Array of detection zones
 */
export function getCameraZones(cameraMetadata: any): DetectionZone[] {
  if (!cameraMetadata || !cameraMetadata.detectionZones) {
    return [];
  }

  return Array.isArray(cameraMetadata.detectionZones)
    ? cameraMetadata.detectionZones
    : [];
}

/**
 * Create a violation description for logging
 * @param violation - Zone violation
 * @returns Human-readable description
 */
export function getViolationDescription(violation: ZoneViolation): string {
  const { zone, detection } = violation;
  
  return `${detection.class} detected in ${zone.type} zone "${zone.name}" with ${Math.round(detection.score * 100)}% confidence`;
}

