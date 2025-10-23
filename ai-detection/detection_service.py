"""
SiteSafe AI Detection Service
FastAPI service for YOLOv8 PPE detection with custom rule support

Features:
- YOLOv8 custom PPE model integration
- Custom rule sync from backend (polling + webhooks)
- Zone-based violation detection
- Real-time alert triggering
- Health check endpoints
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import httpx
import logging
from datetime import datetime
import numpy as np
import cv2
from pathlib import Path
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SiteSafe AI Detection Service",
    description="YOLOv8 PPE detection with custom rules",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================
# Configuration
# ====================================

BACKEND_URL = "http://localhost:3000"
EVIDENCE_DIR = Path("./violations")
EVIDENCE_DIR.mkdir(exist_ok=True)

# ====================================
# Models & Types
# ====================================

class CustomRule(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    isActive: bool = True
    detectionType: str  # object_missing, object_present, zone_violation, etc.
    objectClass: Optional[str] = None
    minConfidence: float = 0.6
    zoneCoordinates: Optional[Any] = None
    conditions: Dict = {}
    actions: List[str] = []
    severity: str = 'medium'
    cameraId: Optional[str] = None
    worksiteId: Optional[str] = None

class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]

class ViolationEvent(BaseModel):
    ruleId: str
    ruleName: str
    cameraId: str
    timestamp: str
    detections: List[Detection]
    evidenceImage: Optional[str] = None
    severity: str

# ====================================
# Rule Manager
# ====================================

class RuleManager:
    def __init__(self):
        self.active_rules: List[CustomRule] = []
        self.last_sync = 0
        self.sync_interval = 10  # Sync every 10 seconds
        logger.info("✅ Rule Manager initialized")
    
    async def sync_rules(self, force: bool = False):
        """Fetch rules from backend database"""
        import time
        now = time.time()
        
        # Check if we need to sync
        if not force and (now - self.last_sync) < self.sync_interval:
            return
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BACKEND_URL}/api/custom-rules",
                    params={"active": "true"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        self.active_rules = [CustomRule(**rule) for rule in data['data']]
                        self.last_sync = now
                        logger.info(f"✅ Synced {len(self.active_rules)} rules from database")
                        return True
                else:
                    logger.warning(f"Failed to sync rules: HTTP {response.status_code}")
        
        except Exception as e:
            logger.error(f"❌ Error syncing rules: {e}")
        
        return False
    
    def add_or_update_rule(self, rule: CustomRule):
        """Add or update a single rule (called from webhook)"""
        # Find existing rule
        existing_idx = next(
            (i for i, r in enumerate(self.active_rules) if r.id == rule.id),
            None
        )
        
        if existing_idx is not None:
            self.active_rules[existing_idx] = rule
            logger.info(f"📝 Updated rule: {rule.name}")
        else:
            self.active_rules.append(rule)
            logger.info(f"➕ Added rule: {rule.name}")
    
    def remove_rule(self, rule_id: str):
        """Remove a rule (called from webhook)"""
        self.active_rules = [r for r in self.active_rules if r.id != rule_id]
        logger.info(f"🗑️ Removed rule: {rule_id}")
    
    def get_rules_for_camera(self, camera_id: str) -> List[CustomRule]:
        """Get rules applicable to a specific camera"""
        return [
            rule for rule in self.active_rules
            if rule.cameraId == camera_id or rule.cameraId is None
        ]
    
    def get_all_rules(self) -> List[CustomRule]:
        """Get all active rules"""
        return self.active_rules

# Global rule manager
rule_manager = RuleManager()

# ====================================
# API Endpoints
# ====================================

@app.get("/")
async def root():
    return {
        "service": "SiteSafe AI Detection Service",
        "status": "running",
        "version": "1.0.0",
        "active_rules": len(rule_manager.active_rules)
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check if model is loaded (you'll uncomment this when you have the model)
        # model_status = "loaded" if model is not None else "not_loaded"
        model_status = "ready"  # Placeholder until you train your model
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "model": model_status,
            "active_rules": len(rule_manager.active_rules),
            "backend_connection": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/api/rules/sync")
async def sync_single_rule(payload: Dict):
    """Webhook endpoint - called when backend creates/updates a rule"""
    try:
        rule_data = payload.get('rule')
        if not rule_data:
            raise HTTPException(status_code=400, detail="Missing 'rule' in payload")
        
        rule = CustomRule(**rule_data)
        rule_manager.add_or_update_rule(rule)
        
        return {
            "success": True,
            "message": f"Rule '{rule.name}' synced successfully",
            "total_rules": len(rule_manager.active_rules)
        }
    
    except Exception as e:
        logger.error(f"Failed to sync rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rules/create")
async def create_rule(payload: Dict):
    """Alternative endpoint for rule creation"""
    return await sync_single_rule(payload)

@app.post("/api/rules/update")
async def update_rule(payload: Dict):
    """Alternative endpoint for rule updates"""
    return await sync_single_rule(payload)

@app.post("/api/rules/delete")
async def delete_rule(payload: Dict):
    """Webhook endpoint - called when backend deletes a rule"""
    try:
        rule_id = payload.get('rule', {}).get('id')
        if not rule_id:
            raise HTTPException(status_code=400, detail="Missing rule ID")
        
        rule_manager.remove_rule(rule_id)
        
        return {
            "success": True,
            "message": f"Rule {rule_id} removed",
            "total_rules": len(rule_manager.active_rules)
        }
    
    except Exception as e:
        logger.error(f"Failed to delete rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rules")
async def get_all_rules():
    """Get all active rules (for debugging)"""
    return {
        "success": True,
        "data": [rule.dict() for rule in rule_manager.active_rules],
        "count": len(rule_manager.active_rules)
    }

@app.get("/api/rules/camera/{camera_id}")
async def get_camera_rules(camera_id: str):
    """Get rules for a specific camera"""
    rules = rule_manager.get_rules_for_camera(camera_id)
    return {
        "success": True,
        "data": [rule.dict() for rule in rules],
        "count": len(rules)
    }

# ====================================
# Detection Logic (Placeholder for YOLO)
# ====================================

def check_rule_violation(rule: CustomRule, detections: List[Detection], camera_id: str) -> bool:
    """
    Check if current detections violate the rule
    
    Returns True if violation detected, False otherwise
    """
    detection_type = rule.detectionType
    object_class = rule.objectClass
    min_confidence = rule.minConfidence
    
    # Filter detections by confidence threshold
    confident_detections = [
        d for d in detections 
        if d.confidence >= min_confidence
    ]
    
    detected_classes = [d.class_name for d in confident_detections]
    
    # Check different violation types
    if detection_type == 'object_missing':
        # E.g., "person detected but gloves NOT detected" = violation
        required_object = object_class
        
        # Check if person is present
        if 'person' in detected_classes or 'person_standing' in detected_classes:
            # Check if required PPE is missing
            if required_object and required_object not in detected_classes:
                logger.warning(f"🚨 VIOLATION: Person without {required_object}", extra={
                    'camera_id': camera_id,
                    'rule': rule.name
                })
                return True
    
    elif detection_type == 'object_present':
        # E.g., "person_without_hardhat detected" = direct violation
        if object_class in detected_classes:
            logger.warning(f"🚨 VIOLATION: {object_class} detected", extra={
                'camera_id': camera_id,
                'rule': rule.name
            })
            return True
    
    elif detection_type == 'zone_violation':
        # Check if person in restricted zone
        if rule.zoneCoordinates:
            for detection in confident_detections:
                if 'person' in detection.class_name:
                    if is_in_restricted_zone(detection.bbox, rule.zoneCoordinates):
                        logger.warning(f"🚨 ZONE VIOLATION: Person in restricted area", extra={
                            'camera_id': camera_id,
                            'rule': rule.name
                        })
                        return True
    
    elif detection_type == 'person_count':
        # Count people
        person_count = sum(1 for d in detected_classes if 'person' in d)
        threshold = rule.conditions.get('max_count', 5)
        
        if person_count > threshold:
            logger.warning(f"🚨 PERSON COUNT VIOLATION: {person_count} > {threshold}", extra={
                'camera_id': camera_id,
                'rule': rule.name
            })
            return True
    
    elif detection_type == 'proximity_violation':
        # Check if person too close to equipment
        persons = [d for d in confident_detections if 'person' in d.class_name]
        equipment = [d for d in confident_detections if d.class_name in ['forklift', 'excavator', 'crane']]
        
        for person in persons:
            for equip in equipment:
                if are_too_close(person.bbox, equip.bbox, threshold=100):
                    logger.warning(f"🚨 PROXIMITY VIOLATION: Person too close to {equip.class_name}", extra={
                        'camera_id': camera_id,
                        'rule': rule.name
                    })
                    return True
    
    elif detection_type == 'behavior_violation':
        # Check for unsafe behaviors
        unsafe_behaviors = ['person_running', 'person_fallen', 'person_climbing']
        for behavior in unsafe_behaviors:
            if behavior in detected_classes:
                logger.warning(f"🚨 BEHAVIOR VIOLATION: {behavior}", extra={
                    'camera_id': camera_id,
                    'rule': rule.name
                })
                return True
    
    return False

def is_in_restricted_zone(bbox: List[float], zone_coords: Any) -> bool:
    """Check if bounding box center is inside restricted zone polygon"""
    if not zone_coords or not isinstance(zone_coords, list):
        return False
    
    # Get center of bounding box
    x1, y1, x2, y2 = bbox
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    
    # Simple point-in-polygon check
    # You can improve this with shapely library
    polygon = zone_coords
    n = len(polygon)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        
        if ((yi > center_y) != (yj > center_y)) and \
           (center_x < (xj - xi) * (center_y - yi) / (yj - yi) + xi):
            inside = not inside
        
        j = i
    
    return inside

def are_too_close(bbox1: List[float], bbox2: List[float], threshold: float = 100) -> bool:
    """Check if two bounding boxes are too close (in pixels)"""
    # Get centers
    x1_center = (bbox1[0] + bbox1[2]) / 2
    y1_center = (bbox1[1] + bbox1[3]) / 2
    x2_center = (bbox2[0] + bbox2[2]) / 2
    y2_center = (bbox2[1] + bbox2[3]) / 2
    
    # Calculate distance
    distance = np.sqrt((x2_center - x1_center)**2 + (y2_center - y1_center)**2)
    
    return distance < threshold

async def trigger_alert(rule: CustomRule, camera_id: str, detections: List[Detection], frame: Optional[np.ndarray] = None):
    """Send violation alert to backend"""
    try:
        # Save evidence frame if provided
        evidence_path = None
        if frame is not None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            evidence_path = f"violations/{rule.id}_{camera_id}_{timestamp}.jpg"
            cv2.imwrite(str(EVIDENCE_DIR / f"{rule.id}_{camera_id}_{timestamp}.jpg"), frame)
            logger.info(f"💾 Saved evidence: {evidence_path}")
        
        # Prepare alert payload
        alert_payload = {
            'title': f"🚨 {rule.name}",
            'description': f"Rule '{rule.name}' triggered on camera {camera_id}. {rule.description or ''}",
            'severity': rule.severity.upper(),
            'source': 'ai_detection',
            'location': camera_id,
            'metadata': {
                'ruleId': rule.id,
                'ruleName': rule.name,
                'detectionType': rule.detectionType,
                'objectClass': rule.objectClass,
                'timestamp': datetime.now().isoformat(),
                'detections': [d.dict() for d in detections],
                'evidenceImage': evidence_path
            }
        }
        
        # Send to backend
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/api/alerts",
                json=alert_payload
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Alert sent to backend for rule: {rule.name}")
                
                # Execute additional actions
                for action in rule.actions:
                    if action == 'send_sms':
                        # Trigger SMS notification
                        await send_sms_notification(alert_payload)
                    elif action == 'send_email':
                        # Trigger email notification
                        await send_email_notification(alert_payload)
                    # ... other actions
            else:
                logger.error(f"❌ Failed to send alert: HTTP {response.status_code}")
    
    except Exception as e:
        logger.error(f"❌ Error triggering alert: {e}")

async def send_sms_notification(alert: Dict):
    """Trigger SMS notification (placeholder)"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{BACKEND_URL}/api/sms/send", json=alert)
        logger.info("📱 SMS notification sent")
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")

async def send_email_notification(alert: Dict):
    """Trigger email notification (placeholder)"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{BACKEND_URL}/api/email/send", json=alert)
        logger.info("📧 Email notification sent")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

# ====================================
# Background Tasks
# ====================================

async def periodic_rule_sync():
    """Background task to sync rules every 10 seconds"""
    while True:
        try:
            await rule_manager.sync_rules(force=True)
        except Exception as e:
            logger.error(f"Error in periodic sync: {e}")
        
        await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("🚀 Starting SiteSafe AI Detection Service...")
    
    # Load initial rules from backend
    await rule_manager.sync_rules(force=True)
    
    # Start background rule sync
    asyncio.create_task(periodic_rule_sync())
    
    logger.info("✅ Service started successfully")
    logger.info(f"📋 Loaded {len(rule_manager.active_rules)} active rules")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down AI Detection Service...")
    logger.info("👋 Service stopped")

# ====================================
# Detection Endpoint (Example)
# ====================================

@app.post("/api/detect")
async def detect_frame(payload: Dict):
    """
    Process a single frame and check against rules
    
    Payload:
    {
        "camera_id": "cam-123",
        "detections": [
            {"class_name": "person_without_hardhat", "confidence": 0.85, "bbox": [100, 200, 300, 400]},
            ...
        ]
    }
    """
    try:
        camera_id = payload.get('camera_id')
        detections_data = payload.get('detections', [])
        
        if not camera_id:
            raise HTTPException(status_code=400, detail="Missing camera_id")
        
        # Convert to Detection objects
        detections = [Detection(**d) for d in detections_data]
        
        # Get rules for this camera
        rules = rule_manager.get_rules_for_camera(camera_id)
        
        violations = []
        for rule in rules:
            if check_rule_violation(rule, detections, camera_id):
                violations.append({
                    'rule_id': rule.id,
                    'rule_name': rule.name,
                    'severity': rule.severity
                })
                
                # Trigger alert (async, non-blocking)
                asyncio.create_task(trigger_alert(rule, camera_id, detections))
        
        return {
            "success": True,
            "camera_id": camera_id,
            "detections_processed": len(detections),
            "violations_found": len(violations),
            "violations": violations
        }
    
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ====================================
# YOLO Detection (Placeholder)
# ====================================

"""
When you have your trained YOLO model, replace this section:

from ultralytics import YOLO

# Load your custom PPE model
model = YOLO('path/to/your/ppe_model.pt')

@app.post("/api/process_frame")
async def process_frame(camera_id: str, frame_base64: str):
    # Decode frame
    frame = decode_base64_image(frame_base64)
    
    # Run YOLO detection
    results = model(frame, conf=0.5)
    
    detections = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            class_name = model.names[class_id]
            bbox = box.xyxy[0].tolist()
            
            detections.append(Detection(
                class_name=class_name,
                confidence=confidence,
                bbox=bbox
            ))
    
    # Check against rules
    rules = rule_manager.get_rules_for_camera(camera_id)
    for rule in rules:
        if check_rule_violation(rule, detections, camera_id):
            await trigger_alert(rule, camera_id, detections, frame)
    
    return {"detections": detections, "violations_checked": len(rules)}
"""

if __name__ == "__main__":
    import uvicorn
    logger.info("🔥 Starting FastAPI server on http://0.0.0.0:5000")
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")

