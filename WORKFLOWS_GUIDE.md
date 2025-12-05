# Workflow Automation System - How It Works

## Overview

The workflow automation system automatically processes AI-detected safety alerts, sends notifications, escalates incidents, and generates reports. It prevents notification fatigue while ensuring critical events get immediate attention.

---

## 🎯 When Do Workflows Run?

**ONLY for AI-detected alerts** from cameras with object detection.

✅ **Workflows Trigger:**
- Alert source = `camera`, `ai`, or `detection`
- Alert has AI detection data (bounding boxes, confidence scores)
- Real-time safety violations detected by cameras

❌ **Workflows DON'T Trigger:**
- Manually created alerts (admin notes, observations)
- Test alerts
- System-generated status alerts

---

## 📊 Complete Alert Processing Flow

```
AI Detection → False-Positive Check → Cooldown Check → Multi-Camera Correlation
    ↓
Shift Grace Period → Severity Classification → Storm Mode Check
    ↓
Incident Report (if SEVERE) → Escalation → Workflows → Metrics Update
```

---

## 🚨 Severity Classification (Deterministic Rules)

**No scoring system** - uses clear, deterministic rules:

### Rule 1: Hard Hat Missing
- **In critical zone** = SEVERE
- **In normal zone** = MODERATE

### Rule 2: Critical Zone Violations
- **Any violation in critical zone** = SEVERE
- Critical zones: restricted areas, edges, heights, scaffolding, confined spaces

### Rule 3: Safety Vest Missing
- **Always** = MODERATE (unless in critical zone, then SEVERE)

### Rule 4: Restricted Zone
- **Always** = SEVERE

### Rule 5: Fall/Height Hazards
- **Always** = CRITICAL

### Rule 6: Equipment Violations
- **Always** = MODERATE

### Rule 7: Generic Detections
- **Always** = MINOR

### Rule 8: Repeated Violations
- **Escalates by one level**: MINOR → MODERATE → SEVERE → CRITICAL

### Rule 9: After-Hours Overrides
- **Non-PPE violations** during after-hours (6 PM - 6 AM) = Escalated to SEVERE
- **PPE violations** during after-hours = No change (workers may not have grabbed PPE yet)

---

## 🛡️ Noise Suppression Layers

### 1. False-Positive Handler

**Low Confidence Suppression:**
- Confidence < 65% + PPE violation = **Suppressed** (no alert sent)
- Marked for human review queue
- Feedback loop for model improvement

**Configuration:**
- Minimum confidence: 65%
- Alert threshold: 70%

### 2. Cooldown Manager

**Prevents spam from same camera/violation:**

- **Per Camera + Type**: 120 seconds between same violation from same camera
- **Per Zone + Violation**: 180 seconds between same violation in same zone

**Example:**
```
Camera sends "missing hard hat" every 15 seconds for same worker
→ First alert: Processed
→ Next 8 alerts: Suppressed (cooldown active)
→ After 120 seconds: Next alert processed
```

### 3. Multi-Camera Correlation

**Stitches same event from multiple cameras:**

- Same worker detected by 2+ cameras within 20 seconds
- Same zone, same violation type
- **Result**: One alert created, all camera evidence aggregated

**Benefits:**
- Reduces noise (no duplicate alerts)
- Better evidence (multiple angles)
- Single incident report with all media

---

## ⏰ Shift Start Grace Period

**Problem:** Workers walking in before grabbing PPE triggers false violations.

**Solution:** 10-minute grace period after shift start.

**Default shift times:**
- 6:00 AM
- 2:00 PM
- 10:00 PM

**Behavior:**
- PPE alerts during grace period → Downgraded to MINOR
- Still logged, but no escalation
- Configurable per worksite

---

## ⚡ Storm Mode (High-Activity Detection)

### Dynamic Threshold (Scales with Site Size)

**Formula:** `max(20, 1.5 × expected workers)`

**Examples:**
- 5-person site: Threshold = 20 alerts
- 50-person site: Threshold = 75 alerts
- 120-person site: Threshold = 180 alerts

**Triggers:**
- Alert count exceeds dynamic threshold in 5 minutes
- OR 3× baseline rate (7-day average)

**Actions:**
- Switches to batching mode
- Groups alerts by zone/camera
- Sends aggregated summary every 5 minutes
- Suppresses duplicates within 2 minutes

---

## 🪜 Escalation Ladder (Severity-Based Timing)

### CRITICAL Alerts
- **Level 1**: Immediate (0 min)
- **Level 2**: Immediate (0 min)
- **Level 3**: Immediate (0 min)
- All levels notified simultaneously

### SEVERE Alerts
- **Level 1**: 3 minutes
- **Level 2**: 8 minutes
- **Level 3**: 15 minutes

### MODERATE Alerts
- **Level 1**: 10 minutes
- **Level 2**: 20 minutes
- **Level 3**: 30 minutes

**Stops when alert is acknowledged.**

---

## 📋 Auto-Generated Incident Reports

### Two Versions:

**1. Field Version (Short, Actionable)**
```
Missing Hard Hat at Zone A

What happened: Worker detected without hard hat
What needs to happen: Immediate supervisor review required
```

**2. Compliance Version (Detailed)**
- Full camera data
- Detection confidence
- Bounding boxes
- Video clips
- Timestamps
- Audit hash

**When Generated:**
- SEVERE or CRITICAL alerts only

**Distribution:**
- Field version → SMS/Email to supervisors
- Compliance version → Stored for insurance/OSHA

---

## 🔍 Pattern Detection

### Hotspot Detection

**Triggers:** 5+ alerts in same zone within 15 minutes

**Actions:**
- Creates hotspot alert
- **Auto-increases severity** for future violations in that zone (+1 level)
- Notifies safety lead
- Triggers additional monitoring

**Example:**
```
Zone "North Entrance" = Hotspot
→ Next violation in that zone: MINOR becomes MODERATE
→ MODERATE becomes SEVERE
```

### Spike Detection

**Triggers:** Alert rate > 40% above baseline (7-day average)

**Actions:**
- Creates spike alert
- Provides trend analysis
- Suggests investigation

---

## 📱 Required Root Cause Tagging

**Before closing MODERATE/SEVERE alerts, supervisor must select:**

- ✅ **PPE Provided** - Worker given required equipment
- ✅ **Worker Removed** - Worker removed from area
- ✅ **Area Secured** - Area secured/restricted
- ✅ **Rebriefing Completed** - Safety briefing conducted
- ✅ **False Positive** - Detection was incorrect
- ✅ **Other** - With notes

**Enforcement:**
- Alert cannot be closed without root cause
- Creates accountability
- Provides data quality for analytics

---

## 🎥 Camera Health Monitoring

### Flapping Detection
- 3 state changes (online/offline) in 15 minutes
- **Action**: Creates MODERATE alert, escalates to supervisor

### Obstruction/Low-Light
- Camera dark or obstructed for 3+ minutes
- **Action**: Creates SEVERE alert, maintenance ticket

### Bitrate Loss
- Frame rate drops below 50% of expected
- **Action**: Creates SEVERE alert, stream quality degraded

---

## 🔄 Human Override & Feedback Loop

### Mark as False Positive

**API:** `POST /api/alerts/:id/mark-false-positive`

**Payload:**
```json
{
  "reason": "Worker was wearing hat, camera angle issue",
  "zone": "Zone A",
  "violationType": "missing_hard_hat"
}
```

**Actions:**
- Marks alert as FALSE_POSITIVE
- Logs feedback for model improvement
- Reduces confidence for that zone/type
- Adds to false positive metrics

### Root Cause Recording

**API:** `PATCH /api/alerts/:id/root-cause`

**Required before closing MODERATE/SEVERE alerts.**

---

## 🌙 After-Hours Overrides

**Default:** 6 PM - 6 AM (configurable per worksite)

**Rules:**
- **Non-PPE violations** → Escalated to SEVERE
- **PPE violations** → No change (may be legitimate)
- **Security notified first** (not safety manager)
- Different escalation chain

**Rationale:** Night operations have different risk profile.

---

## 📊 Default Workflows (Auto-Created)

### 1. High-Severity Alert Notification
- **Trigger**: SEVERE/CRITICAL alerts
- **Actions**: SMS + Incident Report + Escalation

### 2. Camera Offline Notification
- **Trigger**: Camera offline 5+ minutes
- **Actions**: SMS to supervisor

### 3. Daily Safety Summary
- **Trigger**: Scheduled 6:00 PM daily
- **Actions**: Email summary report

### 4. Pattern Detection
- **Trigger**: Every 30 minutes
- **Actions**: Detect spikes/hotspots, notify safety lead

---

## 🔧 Configuration

### Storm Mode
```javascript
THRESHOLD = max(20, 1.5 × expected workers)
TIME_WINDOW = 5 minutes
BATCH_WINDOW = 5 minutes
```

### Cooldowns
```javascript
PER_CAMERA_TYPE = 120 seconds
PER_VIOLATION_ZONE = 180 seconds
```

### Escalation
```javascript
CRITICAL: 0/0/0 minutes
SEVERE: 3/8/15 minutes
MODERATE: 10/20/30 minutes
```

### Confidence Thresholds
```javascript
LOW_CONFIDENCE = 65%
MINIMUM_ALERT = 70%
HIGH_CONFIDENCE = 90%
```

---

## 📈 Metrics Tracked

- Total alerts
- Alerts by type
- Alerts by severity
- Alerts by hour
- Compliance rate
- Violations by zone
- False positive rate
- Camera health status

---

## 🎯 Key Improvements Over Previous Version

✅ **Deterministic rules** (not confusing scores)  
✅ **Site-size scaling** (storm mode adapts to worksite)  
✅ **Faster escalation** (3 min for SEVERE, 0 min for CRITICAL)  
✅ **Short reports** (field version for quick action)  
✅ **Pattern feedback** (hotspots increase future severity)  
✅ **False-positive handling** (suppresses low-confidence noise)  
✅ **Cooldowns** (prevents camera spam)  
✅ **Multi-camera correlation** (stitches same events)  
✅ **Grace periods** (shift start doesn't trigger false alerts)  
✅ **Camera health** (flapping, obstruction detection)  
✅ **Root cause required** (accountability for MODERATE/SEVERE)  
✅ **After-hours rules** (different handling for night ops)  

---

## 🚀 API Endpoints

### Workflows
```
GET    /api/workflows?worksiteId=<id>
POST   /api/workflows
PATCH  /api/workflows/:id
DELETE /api/workflows/:id
```

### Alert Actions
```
POST   /api/alerts/:id/mark-false-positive
PATCH  /api/alerts/:id/root-cause
```

### Incident Reports
```
GET    /api/incidents?worksiteId=<id>
GET    /api/incidents/:id (returns field version)
GET    /api/incidents/:id/compliance (returns full version)
```

---

## 📝 Summary

The workflow system ensures:

✅ **No missed critical alerts** - Faster escalation (3 min for SEVERE)  
✅ **No notification fatigue** - Cooldowns + storm mode + false-positive suppression  
✅ **Audit-ready documentation** - Two-version reports (field + compliance)  
✅ **Proactive insights** - Pattern detection influences severity  
✅ **Accountability** - Root cause required before closing  
✅ **Adaptive** - Scales with site size, learns from feedback  
✅ **Noise-free** - Multi-camera correlation, grace periods, confidence filtering  

All running automatically in the background, 24/7.
