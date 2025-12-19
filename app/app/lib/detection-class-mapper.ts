/**
 * Detection Class Mapper
 * Maps between COCO-SSD generic classes and YOLO custom classes
 * This allows rules to work with both detection systems
 */

// COCO-SSD classes (generic detection)
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
  'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush'
];

// YOLO custom classes (PPE and safety-specific)
export const YOLO_SAFETY_CLASSES = [
  // PPE classes
  'person_with_hardhat',
  'person_without_hardhat',
  'person_with_safety_vest',
  'person_without_safety_vest',
  'person_with_gloves',
  'person_without_gloves',
  'person_with_safety_goggles',
  'person_without_safety_goggles',
  'person_with_fall_harness',
  'person_without_fall_harness',
  'person_with_safety_boots',
  'person_without_safety_boots',
  // Person states
  'person_standing',
  'person_fallen',
  'person_climbing',
  'person_running',
  // Equipment
  'forklift',
  'excavator',
  'crane',
  'ladder',
  'scaffolding',
  'power_tool',
  // Vehicles
  'truck',
  'van',
  'car',
  // Safety barriers
  'safety_cone',
  'barrier',
  'caution_tape',
  'fire_extinguisher'
];

/**
 * Maps COCO-SSD generic classes to YOLO safety classes
 * This allows rules created for YOLO classes to also work with COCO detections
 */
export const COCO_TO_YOLO_MAP: Record<string, string[]> = {
  // Generic "person" can map to any person-related YOLO class
  'person': [
    'person_standing',
    'person_with_hardhat',
    'person_without_hardhat',
    'person_with_safety_vest',
    'person_without_safety_vest'
  ],
  'car': ['car'],
  'truck': ['truck'],
  'bus': ['truck'], // Bus can be treated as truck for safety purposes
  'motorcycle': ['motorcycle'],
  'bicycle': ['bicycle']
};

/**
 * Maps YOLO safety classes back to COCO classes
 * Useful for displaying or logging
 */
export const YOLO_TO_COCO_MAP: Record<string, string> = {
  'person_with_hardhat': 'person',
  'person_without_hardhat': 'person',
  'person_with_safety_vest': 'person',
  'person_without_safety_vest': 'person',
  'person_standing': 'person',
  'person_fallen': 'person',
  'person_climbing': 'person',
  'person_running': 'person',
  'car': 'car',
  'truck': 'truck',
  'van': 'truck'
};

/**
 * Check if a detected class matches a rule's object class
 * Handles both COCO-SSD and YOLO class names
 */
export function matchesRuleClass(
  detectedClass: string,
  ruleObjectClass: string
): boolean {
  const detected = detectedClass.toLowerCase().trim();
  const rule = ruleObjectClass.toLowerCase().trim();

  // Direct match (exact)
  if (detected === rule) {
    return true;
  }

  // Check if detected class is a COCO class that maps to the rule's YOLO class
  if (COCO_TO_YOLO_MAP[detected]) {
    const mappedClasses = COCO_TO_YOLO_MAP[detected].map(c => c.toLowerCase());
    if (mappedClasses.includes(rule)) {
      return true;
    }
  }

  // Check if rule class is a YOLO class that maps back to detected COCO class
  if (YOLO_TO_COCO_MAP[rule]) {
    const mappedCoco = YOLO_TO_COCO_MAP[rule].toLowerCase();
    if (detected === mappedCoco) {
      return true;
    }
  }

  // Special case: "person" matches any person-related YOLO class
  if (detected === 'person' && rule.startsWith('person_')) {
    return true;
  }

  // Special case: YOLO person classes match generic "person" rule
  if (detected.startsWith('person_') && rule === 'person') {
    return true;
  }

  return false;
}

/**
 * Normalize class name for comparison
 * Handles variations in naming
 */
export function normalizeClassName(className: string): string {
  return className.toLowerCase().trim().replace(/[_-]/g, '_');
}

/**
 * Check if a class is a COCO-SSD class
 */
export function isCocoClass(className: string): boolean {
  return COCO_CLASSES.includes(className.toLowerCase());
}

/**
 * Check if a class is a YOLO safety class
 */
export function isYoloSafetyClass(className: string): boolean {
  return YOLO_SAFETY_CLASSES.includes(className.toLowerCase());
}

/**
 * Get all possible class names that could match a rule
 * Useful for debugging or rule validation
 */
export function getMatchingClasses(ruleObjectClass: string): string[] {
  const rule = ruleObjectClass.toLowerCase().trim();
  const matches: string[] = [rule]; // Always include exact match

  // If rule is a YOLO class, add COCO equivalents
  if (YOLO_TO_COCO_MAP[rule]) {
    matches.push(YOLO_TO_COCO_MAP[rule]);
  }

  // If rule is a COCO class, add YOLO equivalents
  if (COCO_TO_YOLO_MAP[rule]) {
    matches.push(...COCO_TO_YOLO_MAP[rule]);
  }

  // Special case: person-related rules
  if (rule === 'person' || rule.startsWith('person_')) {
    matches.push('person');
    matches.push(...YOLO_SAFETY_CLASSES.filter(c => c.startsWith('person_')));
  }

  return [...new Set(matches)]; // Remove duplicates
}

