# Escalation Rules

Documentation for escalation rules based on acknowledgement timeout.

## Overview

Violations escalate to higher severity states when:
1. Not acknowledged within timeout period
2. Acknowledged but unresolved for extended period

## Escalation Timeout Configuration

### Default Timeouts

- **Acknowledgement Timeout**: 30 minutes (configurable via `ACK_TIMEOUT_MINUTES`)
- **Escalation Timeout**: 60 minutes (configurable via `ESCALATION_TIMEOUT_MINUTES`)

### Configuration

```bash
# Environment variables
ACK_TIMEOUT_MINUTES=30      # Time before escalating unacknowledged violations
ESCALATION_TIMEOUT_MINUTES=60  # Time before escalating acknowledged but unresolved violations
```

## Escalation Rule 1: Unacknowledged Violations

### Rule

**If a violation is ACTIVE and not acknowledged within 30 minutes (default), escalate to ESCALATED state.**

### Flow

```
Violation Created (ACTIVE)
    │
    ├─ Time: 0 minutes
    │
    ├─ Time: 15 minutes (still ACTIVE, no ACK)
    │
    ├─ Time: 30 minutes (still ACTIVE, no ACK)
    │   │
    │   └─→ ESCALATE to ESCALATED
    │       │
    │       ├─ Send escalation alerts
    │       ├─ Higher severity notifications
    │       └─ Track escalation metrics
    │
    └─ If acknowledged before 30 minutes:
        └─→ Remain ACTIVE (acknowledged)
```

### Example

```
10:00:00 - Violation detected → ACTIVE
10:15:00 - Still ACTIVE, no acknowledgement
10:30:00 - Still ACTIVE, no acknowledgement → ESCALATED
10:45:00 - User acknowledges → ESCALATED (acknowledged, condition persists)
```

### Implementation

```python
should_escalate = state_manager.should_escalate_for_acknowledgement_timeout(
    violation_state='ACTIVE',
    violation_created_at=datetime(10, 0, 0),
    has_acknowledgement=False,
    current_time=datetime(10, 30, 0)
)
# Returns: True (30 minutes elapsed, no acknowledgement)
```

## Escalation Rule 2: Acknowledged but Unresolved Violations

### Rule

**If a violation is acknowledged but condition persists for more than 60 minutes (default), escalate to ESCALATED state.**

### Flow

```
Violation Created (ACTIVE)
    │
    ├─ Time: 0 minutes
    │
    ├─ Time: 10 minutes → User acknowledges
    │   └─→ ACTIVE (acknowledged)
    │
    ├─ Time: 30 minutes (condition persists)
    │   └─→ ACTIVE (acknowledged)
    │
    ├─ Time: 60 minutes (condition persists)
    │   └─→ ACTIVE (acknowledged)
    │
    ├─ Time: 70 minutes (condition persists > 60 min)
    │   │
    │   └─→ ESCALATE to ESCALATED
    │       │
    │       ├─ Send escalation alerts
    │       ├─ Higher severity notifications
    │       └─ Track escalation metrics
    │
    └─ If condition resolves before 60 minutes:
        └─→ RESOLVED
```

### Example

```
10:00:00 - Violation detected → ACTIVE
10:10:00 - User acknowledges → ACTIVE (acknowledged)
10:30:00 - Condition persists → ACTIVE (acknowledged)
10:50:00 - Condition persists → ACTIVE (acknowledged)
11:10:00 - Condition persists > 60 min → ESCALATED
```

### Implementation

```python
should_escalate = state_manager.should_escalate_for_acknowledgement_timeout(
    violation_state='ACTIVE',
    violation_created_at=datetime(10, 0, 0),
    has_acknowledgement=True,
    current_time=datetime(11, 10, 0)  # 70 minutes later
)
# Returns: True (70 minutes > 60 minutes, condition persists)
```

## Escalation Logic

### State Manager Logic

The `StateManager.should_escalate_for_acknowledgement_timeout()` method:

1. **Checks current state**: If already ESCALATED or RESOLVED, don't escalate
2. **Calculates time elapsed**: Time since violation creation
3. **Checks acknowledgement status**:
   - If not acknowledged → use acknowledgement timeout (30 min default)
   - If acknowledged → use escalation timeout (60 min default)
4. **Returns escalation decision**: True if timeout exceeded

### Pseudocode

```
function should_escalate(violation_state, created_at, has_acknowledgement, current_time):
    if violation_state == ESCALATED or RESOLVED:
        return False
    
    time_elapsed = current_time - created_at
    
    if has_acknowledgement:
        timeout = ESCALATION_TIMEOUT_MINUTES  # 60 min default
    else:
        timeout = ACK_TIMEOUT_MINUTES  # 30 min default
    
    return time_elapsed >= timeout
```

## Escalation Actions

When escalation occurs:

1. **State Transition**: ACTIVE → ESCALATED
2. **Alert Escalation**: Higher-severity alerts sent via Alert Orchestrator
3. **Notification Escalation**: Additional notification channels (SMS, etc.)
4. **Metrics Recording**: Escalation metrics tracked
5. **Audit Logging**: Escalation event logged

## Configuration Recommendations

### Development
- Acknowledgement Timeout: 30 minutes
- Escalation Timeout: 60 minutes

### Production (Standard)
- Acknowledgement Timeout: 30 minutes
- Escalation Timeout: 60 minutes

### Production (High-Priority Sites)
- Acknowledgement Timeout: 15 minutes
- Escalation Timeout: 30 minutes

### Production (Low-Priority Sites)
- Acknowledgement Timeout: 60 minutes
- Escalation Timeout: 120 minutes

## Monitoring

Monitor escalations with metrics:

- `violations_escalated_total{reason, tenant_id}`: Total escalations
- `acknowledgements_created_total{method, tenant_id}`: Acknowledgement rate
- Alert if escalation rate > 20% of violations

## Integration with Alert Orchestrator

Escalation state changes trigger alerts via:

1. **Violation Engine** publishes state change: `ACTIVE → ESCALATED`
2. **Alert Orchestrator** receives state change event
3. **Alert Orchestrator** sends escalation alerts (HIGH/CRITICAL severity)
4. **Acknowledgement Service** tracks acknowledgements for escalated violations

## Examples

### Example 1: Unacknowledged Escalation

```
Timeline:
10:00:00 - Violation detected → ACTIVE
10:15:00 - Alert sent (no ACK)
10:30:00 - Escalation timeout → ESCALATED
10:30:01 - Escalation alert sent (HIGH severity)
10:45:00 - User acknowledges → ESCALATED (acknowledged)
```

### Example 2: Acknowledged but Unresolved Escalation

```
Timeline:
10:00:00 - Violation detected → ACTIVE
10:10:00 - User acknowledges → ACTIVE (acknowledged)
10:30:00 - Condition persists → ACTIVE (acknowledged)
10:50:00 - Condition persists → ACTIVE (acknowledged)
11:10:00 - Escalation timeout → ESCALATED
11:10:01 - Escalation alert sent (HIGH severity)
```

### Example 3: Acknowledgement Prevents Escalation

```
Timeline:
10:00:00 - Violation detected → ACTIVE
10:15:00 - User acknowledges → ACTIVE (acknowledged)
10:30:00 - Would have escalated, but acknowledged → Remains ACTIVE
10:45:00 - Condition resolves → RESOLVED
```

