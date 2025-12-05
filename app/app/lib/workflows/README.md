# Workflow Automation System

## Overview

The workflow automation system provides intelligent, automated responses to safety events. It prevents notification fatigue, ensures timely escalation, and generates audit-ready documentation.

## Core Features

### 1. **Storm Mode / High-Activity Detection** (`storm-mode.ts`)

Prevents notification fatigue during high-activity periods.

**Triggers:**
- 30+ alerts in 5 minutes
- OR 3× baseline alert rate

**Actions:**
- Switches to batching mode
- Groups alerts by zone/camera
- Sends aggregated notifications every 5 minutes
- Suppresses duplicates within 2 minutes
- Sends "High Activity" summary to supervisors

**Configuration:**
```typescript
STORM_MODE_DEFAULTS = {
  ALERT_THRESHOLD: 30,
  TIME_WINDOW_MINUTES: 5,
  BASELINE_MULTIPLIER: 3,
  BATCH_WINDOW_MINUTES: 5,
  DUPLICATE_WINDOW_SECONDS: 120,
}
```

### 2. **Auto-Severity Classification** (`auto-severity.ts`)

Automatically classifies alerts into Minor, Moderate, Severe based on:
- Detection type (hard hat, safety vest, restricted zone, etc.)
- Confidence score (>90% = higher severity)
- Location context (restricted zones = higher severity)
- Time of day (work hours = higher severity)
- Pattern (repeated violations = higher severity)

**Severity Tiers:**
- **MINOR** (score < 50): Batched notifications, logged only
- **MODERATE** (score 50-79): Requires supervisor acknowledgment
- **SEVERE** (score ≥ 80): Immediate SMS + escalation + auto-report generation
- **CRITICAL**: Skip to top of escalation chain immediately

### 3. **Escalation Ladder** (`escalation-processor.ts`)

Automatic escalation for unacknowledged alerts.

**Timeline:**
- T+5 min → Site Lead (SMS)
- T+10 min → Site Supervisor (SMS)
- T+20 min → Safety Manager (Email)

**Features:**
- Runs every minute checking for unacknowledged alerts
- Creates audit trail for every escalation step
- Stops when alert is acknowledged
- Configurable per worksite

### 4. **Auto-Report Generation** (`alert-processor.ts`)

Generates audit-ready incident reports for SEVERE/CRITICAL events.

**Report Includes:**
- Report number (INC-2025-001234)
- Camera snapshots (timestamped frames)
- Video clips (if available)
- Detection data (bounding boxes, confidence)
- Location, timestamp, severity
- Immutable audit hash for tamper resistance

**Auto-distributed to:**
- Safety manager
- Incident log storage
- Audit system

### 5. **Pattern Detection** (`pattern-detection.ts`)

Detects operational trends and hotspots.

**Spike Detection:**
- Alerts when alert rate > 40% over baseline (7-day average)
- Creates pattern alert for investigation

**Hotspot Detection:**
- 5+ alerts in same zone within 15 minutes
- Creates hotspot alert with severity breakdown

**Time-of-Day Patterns:**
- Identifies peak alert hours
- Provides recommendations (e.g., "Safety briefing before 8:00 AM")

### 6. **Workflow Engine** (`workflow-engine.ts`)

Core orchestrator that processes all workflows.

**Capabilities:**
- Processes alert through all applicable workflows
- Executes actions (SMS, email, webhook, incident creation)
- Tracks execution history
- Template rendering with variables
- Priority-based execution

## Workflow Types

```typescript
enum WorkflowType {
  ALERT_ESCALATION,      // Escalate based on severity/time
  CAMERA_HEALTH,         // Monitor camera status
  SCHEDULED_REPORT,      // Daily/weekly summaries
  PATTERN_DETECTION,     // Spike/hotspot detection
  AUTO_CLASSIFICATION,   // Auto-tag severity
  INCIDENT_REPORT,       // Auto-generate reports
  STORM_MODE            // High-activity batching
}
```

## Alert Processing Flow

When a new alert is created:

```
1. Alert created via API
   ↓
2. Auto-Severity Classifier
   → Assigns MINOR/MODERATE/SEVERE/CRITICAL
   ↓
3. Storm Mode Check
   → If storm mode: Add to batch, suppress individual notification
   → If normal: Continue to step 4
   ↓
4. Generate Incident Report (if SEVERE/CRITICAL)
   → Creates INC-YYYY-NNNNNN report
   → Captures snapshots, video, detection data
   ↓
5. Start Escalation (if SEVERE/CRITICAL or auto-escalate flag)
   → Creates escalation record
   → Escalation processor handles timing
   ↓
6. Execute Workflows
   → Runs all enabled workflows matching trigger
   → Sends SMS/email/webhook notifications
   ↓
7. Update Metrics
   → Increments daily counters
   → Updates hourly/type/severity breakdowns
```

## API Endpoints

### Workflows
```
GET    /api/workflows?worksiteId=<id>  - List workflows
POST   /api/workflows                  - Create workflow
GET    /api/workflows/:id              - Get workflow details
PATCH  /api/workflows/:id              - Update workflow
DELETE /api/workflows/:id              - Delete workflow
```

### Escalations
```
GET    /api/escalations?worksiteId=<id> - List escalation chains
POST   /api/escalations                 - Create escalation chain
PATCH  /api/escalations/:id             - Update chain
```

### Incident Reports
```
GET    /api/incidents?worksiteId=<id>  - List reports
GET    /api/incidents/:id              - Get report PDF
```

## Auto-Provisioning for New Worksites

When a worksite is created, call:

```typescript
import { initializeWorksiteAutomation } from '@/app/lib/workflows/default-workflows';

await initializeWorksiteAutomation(worksiteId, {
  supervisorPhone: '+15551234567',
  supervisorEmail: 'supervisor@example.com'
});
```

This auto-creates:
- 4 default workflows (alert escalation, camera health, daily summary, pattern detection)
- Default escalation chain (3-level, 5/10/20 minute delays)
- Baseline thresholds

## Configuration

### Storm Mode Thresholds
Edit `STORM_MODE_DEFAULTS` in `storm-mode.ts`

### Escalation Timing
Edit `ESCALATION_DEFAULTS` in `escalation-processor.ts`

### Pattern Detection
Edit `PATTERN_DEFAULTS` in `pattern-detection.ts`

## Template Variables

Available in SMS/email templates:

- `{{worksite_id}}` - Worksite ID
- `{{camera_id}}` - Camera ID
- `{{alert_id}}` - Alert ID
- `{{severity}}` - Alert severity
- `{{description}}` - Alert description
- `{{location}}` - Alert location/zone
- `{{timestamp}}` - Alert timestamp

## Database Schema

### Key Tables
- `Workflow` - Workflow definitions
- `WorkflowExecution` - Execution logs
- `EscalationChain` - Escalation configurations
- `Escalation` - Active escalations
- `NotificationLog` - All notifications sent
- `IncidentReport` - Auto-generated reports
- `WorksiteMetrics` - Daily metrics for baseline calculation
- `AlertBatch` - Storm mode batches

## Future Enhancements

- [ ] Daily/weekly digest generation
- [ ] Twilio/SendGrid integration for actual SMS/email sending
- [ ] Webhook delivery with retry logic
- [ ] Workflow builder UI
- [ ] Advanced pattern detection (ML-based anomaly detection)
- [ ] Cost tracking per notification
- [ ] Blackout windows (quiet hours)

## Questions?

This is a production-ready foundation. The system is designed to be:
- **Idempotent**: Safe to retry
- **Observable**: Full audit logs
- **Configurable**: Per-worksite overrides
- **Scalable**: Async processing, batching support
- **Secure**: Role-based access, audit trails

All components are modular and can be enhanced incrementally.

