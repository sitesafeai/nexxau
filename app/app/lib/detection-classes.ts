/**
 * Detection Classes Configuration
 * 
 * Shared between frontend and AI service.
 * These are the objects your YOLO model will be trained to detect.
 */

export interface DetectionClass {
  id: string;
  name: string;
  category: 'ppe' | 'person' | 'equipment' | 'vehicle' | 'zone' | 'behavior';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  color: string; // For UI display
}

export const DETECTION_CLASSES: DetectionClass[] = [
  // ========================================
  // PPE (Personal Protective Equipment)
  // ========================================
  {
    id: 'helmet',
    name: 'Helmet ✓ (Compliant)',
    category: 'ppe',
    description: 'Worker wearing hard hat — matches YOLO class "helmet". Use to log/confirm compliant PPE.',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'no_helmet',
    name: 'No Helmet (Violation)',
    category: 'ppe',
    description: 'Worker NOT wearing hard hat (VIOLATION) — matches YOLO class "no_helmet"',
    severity: 'critical',
    color: '#ef4444' // red
  },
  {
    id: 'vest',
    name: 'Safety Vest ✓ (Compliant)',
    category: 'ppe',
    description: 'Worker wearing high-vis vest — matches YOLO class "vest". Use to log/confirm compliant PPE.',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'no_vest',
    name: 'No Safety Vest (Violation)',
    category: 'ppe',
    description: 'Worker NOT wearing safety vest (VIOLATION) — matches YOLO class "no_vest"',
    severity: 'high',
    color: '#f59e0b' // orange
  },
  {
    id: 'gloves',
    name: 'Gloves ✓ (Compliant)',
    category: 'ppe',
    description: 'Worker wearing gloves — matches YOLO class "gloves".',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'no_gloves',
    name: 'No Gloves (Violation)',
    category: 'ppe',
    description: 'Worker NOT wearing gloves (VIOLATION) — matches YOLO class "no_gloves"',
    severity: 'high',
    color: '#f59e0b' // orange
  },
  {
    id: 'goggles',
    name: 'Goggles ✓ (Compliant)',
    category: 'ppe',
    description: 'Worker wearing eye protection — matches YOLO class "goggles".',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'no_goggles',
    name: 'No Goggles (Violation)',
    category: 'ppe',
    description: 'Worker NOT wearing eye protection (VIOLATION) — matches YOLO class "no_goggles"',
    severity: 'high',
    color: '#f59e0b' // orange
  },
  {
    id: 'person_with_fall_harness',
    name: 'Person With Fall Harness',
    category: 'ppe',
    description: 'Worker wearing fall protection harness',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'person_without_fall_harness',
    name: 'Person Without Fall Harness',
    category: 'ppe',
    description: 'Worker at height WITHOUT fall protection (VIOLATION)',
    severity: 'critical',
    color: '#ef4444' // red
  },
  {
    id: 'person_with_safety_boots',
    name: 'Person With Safety Boots',
    category: 'ppe',
    description: 'Worker wearing steel-toe/safety boots',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'no_boots',
    name: 'No Safety Boots (Violation)',
    category: 'ppe',
    description: 'Worker NOT wearing proper footwear (VIOLATION) — matches YOLO class "no_boots"',
    severity: 'medium',
    color: '#f59e0b' // orange
  },

  // ========================================
  // People & Behavior
  // ========================================
  {
    id: 'person_detected',
    name: 'Person Detected (Any)',
    category: 'person',
    description: 'Any person visible in frame — use this with the default COCO YOLO model',
    severity: 'medium',
    color: '#8b5cf6' // purple
  },
  {
    id: 'person_standing',
    name: 'Person Standing',
    category: 'person',
    description: 'Person in normal standing position',
    severity: 'low',
    color: '#3b82f6' // blue
  },
  {
    id: 'fall_detected',
    name: 'Fall Detected',
    category: 'behavior',
    description: 'Person on ground / fall incident detected — matches YOLO class "fall_detected"',
    severity: 'critical',
    color: '#ef4444' // red
  },
  {
    id: 'mask',
    name: 'Mask ✓ (Compliant)',
    category: 'ppe',
    description: 'Worker wearing face mask — matches YOLO class "mask".',
    severity: 'low',
    color: '#10b981' // green
  },
  {
    id: 'no_mask',
    name: 'No Mask (Violation)',
    category: 'ppe',
    description: 'Worker NOT wearing face mask — matches YOLO class "no_mask"',
    severity: 'medium',
    color: '#f59e0b' // orange
  },
  {
    id: 'person_climbing',
    name: 'Person Climbing',
    category: 'behavior',
    description: 'Person on ladder or elevated surface',
    severity: 'high',
    color: '#f59e0b' // orange
  },
  {
    id: 'person_running',
    name: 'Person Running',
    category: 'behavior',
    description: 'Person moving quickly (unsafe behavior)',
    severity: 'medium',
    color: '#f59e0b' // orange
  },
  {
    id: 'person_near_equipment',
    name: 'Person Near Heavy Equipment',
    category: 'behavior',
    description: 'Person too close to machinery (danger zone)',
    severity: 'high',
    color: '#ef4444' // red
  },

  // ========================================
  // Equipment & Machinery
  // ========================================
  {
    id: 'forklift',
    name: 'Forklift',
    category: 'equipment',
    description: 'Forklift vehicle',
    severity: 'medium',
    color: '#f59e0b' // orange
  },
  {
    id: 'excavator',
    name: 'Excavator',
    category: 'equipment',
    description: 'Heavy excavation equipment',
    severity: 'medium',
    color: '#f59e0b' // orange
  },
  {
    id: 'crane',
    name: 'Crane',
    category: 'equipment',
    description: 'Construction crane',
    severity: 'high',
    color: '#ef4444' // red
  },
  {
    id: 'ladder',
    name: 'Ladder',
    category: 'equipment',
    description: 'Ladder or step ladder',
    severity: 'medium',
    color: '#f59e0b' // orange
  },
  {
    id: 'scaffolding',
    name: 'Scaffolding',
    category: 'equipment',
    description: 'Scaffolding structure',
    severity: 'high',
    color: '#f59e0b' // orange
  },
  {
    id: 'power_tool',
    name: 'Power Tool',
    category: 'equipment',
    description: 'Power drill, saw, grinder, etc.',
    severity: 'medium',
    color: '#f59e0b' // orange
  },

  // ========================================
  // Vehicles
  // ========================================
  {
    id: 'truck',
    name: 'Truck',
    category: 'vehicle',
    description: 'Delivery or dump truck',
    severity: 'medium',
    color: '#f59e0b' // orange
  },
  {
    id: 'van',
    name: 'Van',
    category: 'vehicle',
    description: 'Work van or service vehicle',
    severity: 'low',
    color: '#3b82f6' // blue
  },
  {
    id: 'car',
    name: 'Car',
    category: 'vehicle',
    description: 'Passenger vehicle',
    severity: 'low',
    color: '#3b82f6' // blue
  },

  // ========================================
  // Safety Barriers & Zones
  // ========================================
  {
    id: 'safety_cone',
    name: 'Safety Cone',
    category: 'zone',
    description: 'Traffic or safety cone',
    severity: 'low',
    color: '#f59e0b' // orange
  },
  {
    id: 'barrier',
    name: 'Barrier/Fence',
    category: 'zone',
    description: 'Safety barrier or temporary fence',
    severity: 'low',
    color: '#f59e0b' // orange
  },
  {
    id: 'caution_tape',
    name: 'Caution Tape',
    category: 'zone',
    description: 'Caution or danger tape',
    severity: 'low',
    color: '#f59e0b' // orange
  },
  {
    id: 'fire_extinguisher',
    name: 'Fire Extinguisher',
    category: 'equipment',
    description: 'Fire extinguisher (safety equipment)',
    severity: 'low',
    color: '#ef4444' // red
  },
  {
    id: 'first_aid_kit',
    name: 'First Aid Kit',
    category: 'equipment',
    description: 'First aid kit or medical supplies',
    severity: 'low',
    color: '#10b981' // green
  }
];

// Helper functions
export function getDetectionClass(id: string): DetectionClass | undefined {
  return DETECTION_CLASSES.find(dc => dc.id === id);
}

export function getClassesByCategory(category: DetectionClass['category']): DetectionClass[] {
  return DETECTION_CLASSES.filter(dc => dc.category === category);
}

export function getPPEClasses(): DetectionClass[] {
  return getClassesByCategory('ppe');
}

export function getViolationClasses(): DetectionClass[] {
  return DETECTION_CLASSES.filter(dc => 
    dc.id.includes('without') || 
    dc.severity === 'critical' || 
    dc.severity === 'high'
  );
}

export function getSafetyClasses(): DetectionClass[] {
  return DETECTION_CLASSES.filter(dc => 
    dc.id.includes('with') && 
    dc.category === 'ppe'
  );
}

// Detection types for rule builder
export const DETECTION_TYPES = [
  { id: 'object_missing', name: 'Object Missing', description: 'Alert when required object is not detected' },
  { id: 'object_present', name: 'Object Present', description: 'Alert when prohibited object is detected' },
  { id: 'zone_violation', name: 'Zone Violation', description: 'Alert when person enters restricted zone' },
  { id: 'person_count', name: 'Person Count', description: 'Alert when person count exceeds threshold' },
  { id: 'proximity_violation', name: 'Proximity Violation', description: 'Alert when person too close to equipment' },
  { id: 'behavior_violation', name: 'Unsafe Behavior', description: 'Alert on dangerous behavior (running, climbing without harness)' }
];

// Actions that can be triggered
export const ALERT_ACTIONS = [
  { id: 'create_alert',     name: 'Create Alert',           description: 'Create alert record in database' },
  { id: 'send_email',       name: 'Send Email',             description: 'Email notification to supervisors' },
  { id: 'log_event',        name: 'Log Event',              description: 'Log to system logs only' },
  { id: 'notify_dashboard', name: 'Dashboard Notification', description: 'Show real-time notification on dashboard' },
  { id: 'send_sms',         name: 'Send SMS',               description: 'SMS notification to emergency contacts', comingSoon: true },
  { id: 'sound_alarm',      name: 'Sound Alarm',            description: 'Trigger audible alarm on-site', comingSoon: true },
  { id: 'capture_video',    name: 'Capture Video',          description: 'Record 30-second video clip as evidence', comingSoon: true },
];

// Severity levels
export const SEVERITY_LEVELS = [
  { id: 'low', name: 'Low', color: '#10b981', description: 'Minor issue, log for review' },
  { id: 'medium', name: 'Medium', color: '#f59e0b', description: 'Moderate concern, notify supervisor' },
  { id: 'high', name: 'High', color: '#ef4444', description: 'Serious violation, immediate notification' },
  { id: 'critical', name: 'Critical', color: '#dc2626', description: 'Life-threatening, emergency response required' }
];

