# Alert Flow Diagram

Documentation of the alert orchestration flow.

## Alert Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Violation Engine                                               │
│  publishes to: violations:state_changes (Redis Stream)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Alert Orchestrator Service                                     │
│  Consumer Group: alert-orchestrator                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Filter State Changes                                  │
│  - Only process ACTIVE and ESCALATED states                     │
│  - Check should_alert flag                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Rate Limiting Check                                   │
│  - Check camera rate limit (default: 5/min)                     │
│  - Check user rate limits (default: 10/min)                     │
│  - If rate-limited: Skip alert, log, return                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │ Allowed?│
                    └────┬────┘
                         │ No
                    ┌────┴─────────┐
                    │              │ Yes
                    ▼              ▼
        ┌───────────────┐  ┌─────────────────────────────┐
        │ Rate Limited  │  │ Step 3: Determine Severity  │
        │ - Log metric  │  │ - Base: ACTIVE=MEDIUM       │
        │ - Return      │  │ - Base: ESCALATED=HIGH      │
        └───────────────┘  │ - Escalate to CRITICAL      │
                           │   after 15 min (default)     │
                           └──────────────┬───────────────┘
                                          │
                                          ▼
                           ┌─────────────────────────────┐
                           │ Step 4: Select Channels     │
                           │ - MEDIUM: Socket.IO, Email  │
                           │ - HIGH: Add SMS             │
                           │ - CRITICAL: All channels    │
                           └──────────────┬──────────────┘
                                          │
                                          ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Step 5: Send to Channels (with Retry)                 │
        │                                                         │
        │  For each channel:                                      │
        │  ┌──────────────────────────────────────────────┐      │
        │  │ Attempt 1: Send alert                        │      │
        │  │   ├─ Success → Record, Log, Continue         │      │
        │  │   └─ Failure → Retry with backoff            │      │
        │  │                                               │      │
        │  │ Attempt 2: Retry (after 1s + jitter)         │      │
        │  │   ├─ Success → Record, Log, Continue         │      │
        │  │   └─ Failure → Retry with backoff            │      │
        │  │                                               │      │
        │  │ Attempt 3: Retry (after 2s + jitter)         │      │
        │  │   ├─ Success → Record, Log, Continue         │      │
        │  │   └─ Failure → Log failure, Continue         │      │
        │  └──────────────────────────────────────────────┘      │
        └────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Step 6: Update Rate Limiter                            │
        │  - Record successful alerts per camera                   │
        │  - Record successful alerts per user                     │
        └────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Step 7: Log Results                                    │
        │  - Success metrics                                      │
        │  - Failure logs                                         │
        │  - Audit trail                                          │
        └─────────────────────────────────────────────────────────┘
```

## Channel-Specific Flows

### Socket.IO Channel

```
Alert Orchestrator
       │
       ▼
┌──────────────────┐
│ Socket.IO Channel│
│ - Build payload  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Redis Pub/Sub    │
│ Channel:         │
│ alerts:socketio: │
│ tenant:{id}      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Socket.IO Server │
│ (separate        │
│  service)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Connected        │
│ Clients          │
└──────────────────┘
```

### Email Channel

```
Alert Orchestrator
       │
       ▼
┌──────────────────┐
│ Email Channel    │
│ - Build HTML/    │
│   text message   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ SMTP Server      │
│ (Gmail SMTP)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Recipient        │
│ Email Inboxes    │
└──────────────────┘
```

### SMS Channel (Twilio)

```
Alert Orchestrator
       │
       ▼
┌──────────────────┐
│ SMS Channel      │
│ - Build concise  │
│   message        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Twilio API       │
│ - Send SMS       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Recipient        │
│ Phone Numbers    │
└──────────────────┘
```

## Retry Flow

```
Send Alert
    │
    ▼
┌─────────┐
│ Attempt │
│   1     │
└────┬────┘
     │
     ├─ Success → Done ✓
     │
     └─ Failure
         │
         ▼
    ┌────────────┐
    │ Wait: 1s + │
    │ jitter     │
    └─────┬──────┘
          │
          ▼
    ┌─────────┐
    │ Attempt │
    │   2     │
    └────┬────┘
         │
         ├─ Success → Done ✓
         │
         └─ Failure
             │
             ▼
        ┌────────────┐
        │ Wait: 2s + │
        │ jitter     │
        └─────┬──────┘
              │
              ▼
        ┌─────────┐
        │ Attempt │
        │   3     │
        └────┬────┘
             │
             ├─ Success → Done ✓
             │
             └─ Failure → Log Failure, Continue ✗
```

## State Transitions

```
PENDING ────┐
            │
            ▼
          ACTIVE ────┐
            │        │
            │        │
            ▼        │
        ESCALATED    │
            │        │
            │        │
            ▼        ▼
         RESOLVED
```

Alert triggers:
- **PENDING → ACTIVE**: MEDIUM severity alert
- **ACTIVE → ESCALATED**: HIGH severity alert
- **ACTIVE → ACTIVE** (after 15 min): CRITICAL severity alert

