# State Transitions

Documentation for violation state transitions with acknowledgement logic.

## Overview

Violation states transition based on:
1. Detection conditions (whether violation condition persists)
2. Acknowledgement status (whether violation is acknowledged)
3. Time-based escalation (timeout-based escalation rules)

## State Definitions

- **PENDING**: Initial state, violation detected but not yet confirmed
- **ACTIVE**: Violation confirmed and active
- **ACKNOWLEDGED**: Violation acknowledged (but condition may still persist)
- **ESCALATED**: Violation escalated due to timeout or severity
- **RESOLVED**: Violation condition no longer exists

## State Transition Rules

### Rule 1: Acknowledgement Doesn't Auto-Resolve

**Key Principle**: Acknowledgement does NOT automatically resolve violations.

- Violation remains **OPEN** (ACTIVE or ESCALATED) if condition persists
- Acknowledgement is tracked separately from violation state
- Violation state is based on whether the condition exists, not acknowledgement status

### Rule 2: Acknowledgement from ACTIVE/ESCALATED

```
ACTIVE ────[Acknowledge]───→ ACTIVE (acknowledged, condition persists)
ESCALATED ─[Acknowledge]───→ ESCALATED (acknowledged, condition persists)
```

**Note**: State remains ACTIVE/ESCALATED even after acknowledgement if condition persists.

### Rule 3: Resolution Based on Condition

```
ACTIVE ────[Condition resolved]───→ RESOLVED
ESCALATED ─[Condition resolved]───→ RESOLVED
```

Resolution happens when violation condition no longer persists, regardless of acknowledgement status.

### Rule 4: Escalation Timeout

#### Unacknowledged Violations

```
ACTIVE ────[No ACK after 30 min]───→ ESCALATED
```

- If violation is ACTIVE and not acknowledged within 30 minutes (default)
- State transitions to ESCALATED
- Triggers escalation alerts

#### Acknowledged but Unresolved Violations

```
ACTIVE (acknowledged) ────[Condition persists > 60 min]───→ ESCALATED
```

- If violation is acknowledged but condition persists for > 60 minutes (default)
- State transitions to ESCALATED
- Indicates persistent violation that needs attention

## State Transition Diagram

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
                    [Threshold met]
                         │
                         ▼
                    ┌─────────┐
                    │ ACTIVE  │◄────────┐
                    └────┬────┘         │
                         │              │
         ┌───────────────┼──────────────┘
         │               │              │
         │          [Acknowledge]       │
         │               │              │
         │               │              │
         │               ▼              │
         │      ┌──────────────────┐   │
         │      │ ACTIVE           │   │
         │      │ (acknowledged)   │   │
         │      └──────┬───────────┘   │
         │             │                │
    [No ACK           │          [Condition
     after            │           persists
     30 min]          │           > 60 min]
         │             │                │
         │             │                │
         ▼             ▼                │
    ┌─────────┐  ┌───────────┐        │
    │ESCALATED│◄─┤ ESCALATED │        │
    │(no ACK) │  │(acknowledged)      │
    └────┬────┘  └─────┬─────┘        │
         │             │               │
         │             │               │
         │    [Acknowledge]            │
         │             │               │
         │             │               │
         │             ▼               │
         │      ┌───────────┐         │
         │      │ ESCALATED │         │
         │      │(acknowledged)       │
         │      └─────┬─────┘         │
         │            │               │
         │            │               │
         └────────────┼───────────────┘
                      │
           [Condition resolved]
                      │
                      ▼
                 ┌─────────┐
                 │RESOLVED │
                 └─────────┘
```

## Acknowledgement Methods

### 1. Web Acknowledgement

**Method**: `POST /acknowledge`
**Payload**:
```json
{
  "violation_id": "...",
  "tenant_id": "...",
  "user_id": "...",
  "note": "..." (optional)
}
```

**Flow**:
1. User clicks "Acknowledge" button in web interface
2. Frontend sends POST request with violation and user info
3. Service creates acknowledgement record
4. Violation state remains ACTIVE/ESCALATED if condition persists

### 2. Email Link Acknowledgement

**Method**: `GET /acknowledge/email?token=...`
**Token**: Secure token generated with violation_id, tenant_id, user_id

**Flow**:
1. User receives email alert with acknowledgement link
2. User clicks link (contains secure token)
3. Service validates token and creates acknowledgement
4. Returns HTML confirmation page
5. Violation state remains ACTIVE/ESCALATED if condition persists

### 3. SMS Acknowledgement

**Method**: `POST /acknowledge/sms`
**Payload**: Twilio webhook format
```json
{
  "violation_id": "...",
  "tenant_id": "...",
  "From": "+1234567890",
  "Body": "..." (optional note)
}
```

**Flow**:
1. User receives SMS alert
2. User replies to SMS (or sends acknowledgement command)
3. Twilio webhook sends POST request
4. Service creates acknowledgement record
5. Returns Twilio XML response
6. Violation state remains ACTIVE/ESCALATED if condition persists

## Escalation Logic

### Escalation Triggers

1. **Acknowledgement Timeout** (default: 30 minutes)
   - Violation is ACTIVE and not acknowledged
   - Transition: ACTIVE → ESCALATED

2. **Unresolved Timeout** (default: 60 minutes)
   - Violation is acknowledged but condition persists
   - Transition: ACTIVE/ESCALATED → ESCALATED

### Escalation Actions

When violation escalates:
1. State changes to ESCALATED
2. Escalation alerts sent (via Alert Orchestrator)
3. Higher-severity notifications
4. Escalation metrics recorded

## Database Schema Usage

### Acknowledgements Table

Uses existing `acknowledgements` table from `001_initial_schema.sql`:

```sql
CREATE TABLE acknowledgements (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    violation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (user_id, violation_id)
);
```

**Method Tracking**: Method is stored in `note` field with format `[method] note_text`
- Example: `[email_link] Acknowledged via email`
- Default: `[web]` if no note

**Future Enhancement**: Add `method` column to schema:

```sql
ALTER TABLE acknowledgements
ADD COLUMN method VARCHAR(20) CHECK (method IN ('web', 'email_link', 'sms'));
```

### Querying Acknowledgements

**Get acknowledgements for violation**:
```sql
SELECT * FROM acknowledgements
WHERE violation_id = ?
ORDER BY acknowledged_at DESC;
```

**Check if violation is acknowledged**:
```sql
SELECT 1 FROM acknowledgements
WHERE violation_id = ?
LIMIT 1;
```

**Get first acknowledgement**:
```sql
SELECT * FROM acknowledgements
WHERE violation_id = ?
ORDER BY acknowledged_at ASC
LIMIT 1;
```

## Examples

### Example 1: Web Acknowledgement

```
1. Violation detected → ACTIVE
2. User clicks "Acknowledge" in web UI
3. POST /acknowledge with violation_id, user_id
4. Acknowledgement created (method: web)
5. Violation remains ACTIVE (condition persists)
6. After 60 minutes, if condition still persists → ESCALATED
```

### Example 2: Email Link Acknowledgement

```
1. Violation detected → ACTIVE
2. Email alert sent with acknowledgement link
3. User clicks link (GET /acknowledge/email?token=...)
4. Token validated, acknowledgement created (method: email_link)
5. HTML confirmation page returned
6. Violation remains ACTIVE (condition persists)
```

### Example 3: Escalation Timeout

```
1. Violation detected → ACTIVE (10:00:00)
2. No acknowledgement received
3. After 30 minutes (10:30:00) → ESCALATED
4. Escalation alerts sent
5. User acknowledges at 10:45:00
6. Violation remains ESCALATED (condition persists)
```

### Example 4: Resolution

```
1. Violation detected → ACTIVE
2. User acknowledges (condition persists)
3. Violation remains ACTIVE (acknowledged)
4. Condition resolves (no more detections)
5. State transitions → RESOLVED
```

