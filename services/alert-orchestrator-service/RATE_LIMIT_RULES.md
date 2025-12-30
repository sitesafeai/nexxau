# Rate Limit Rules

Documentation for rate limiting rules in the Alert Orchestrator.

## Overview

Rate limiting prevents alert flooding by restricting the number of alerts that can be sent within a time window. The Alert Orchestrator implements rate limiting at two levels:

1. **Per-Camera Rate Limiting**: Limits alerts per camera
2. **Per-User Rate Limiting**: Limits alerts per user/recipient

## Rate Limit Configuration

### Default Limits

- **Camera Rate Limit**: 5 alerts per minute (configurable via `RATE_LIMIT_CAMERA_PER_MINUTE`)
- **User Rate Limit**: 10 alerts per minute (configurable via `RATE_LIMIT_USER_PER_MINUTE`)
- **Time Window**: 60 seconds (sliding window)

### Configuration Example

```bash
# Environment variables
RATE_LIMIT_CAMERA_PER_MINUTE=5
RATE_LIMIT_USER_PER_MINUTE=10
```

## Rate Limit Algorithm

### Sliding Window

The rate limiter uses a **sliding window** algorithm:

1. Track alert timestamps for each camera/user
2. For each new alert, count alerts within the last 60 seconds
3. If count >= limit, reject the alert
4. Periodically clean up old timestamps (outside the window)

### Example Timeline

```
Time:     0s    10s   20s   30s   40s   50s   60s   70s
Camera:   ✓     ✓     ✓     ✓     ✓     ✗     ✓     ✓
          │     │     │     │     │     │     │     │
          └─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                                   60s window

At 50s: 5 alerts in last 60s → Rate limited ✗
At 60s: 4 alerts in last 60s → Allowed ✓
```

## Rate Limit Rules

### Rule 1: Camera Rate Limiting

**Purpose**: Prevent a single camera from generating too many alerts.

**Enforcement**:
- Track alerts per `camera_id`
- Default limit: 5 alerts per 60 seconds
- Applied to all alerts regardless of severity or state

**Example**:
```
Camera "camera-123":
- 10:00:00 - Alert 1 ✓
- 10:00:15 - Alert 2 ✓
- 10:00:30 - Alert 3 ✓
- 10:00:45 - Alert 4 ✓
- 10:01:00 - Alert 5 ✓
- 10:01:10 - Alert 6 ✗ (rate limited - 5 alerts in last 60s)
- 10:01:15 - Alert 7 ✓ (only 4 alerts in last 60s now)
```

### Rule 2: User Rate Limiting

**Purpose**: Prevent individual users from being overwhelmed with alerts.

**Enforcement**:
- Track alerts per `user_id` (derived from recipients)
- Default limit: 10 alerts per 60 seconds
- Applied across all cameras and violations
- Checks all recipients in the alert

**Example**:
```
User "user-456":
- 10:00:00 - Alert 1 (camera-123) ✓
- 10:00:10 - Alert 2 (camera-123) ✓
- 10:00:20 - Alert 3 (camera-124) ✓
- ... (7 more alerts)
- 10:00:55 - Alert 10 (camera-125) ✓
- 10:01:00 - Alert 11 (camera-123) ✗ (rate limited - 10 alerts in last 60s)
```

### Rule 3: Combined Enforcement

**Both limits must pass** for an alert to be sent:

```
Alert Request
    │
    ├─ Check Camera Rate Limit
    │   ├─ Allowed? ──┐
    │   └─ Denied? ────┼──→ Rate Limited (camera_limit_exceeded)
    │                   │
    └─ Check User Rate Limit(s)
        ├─ Allowed? ───┘
        └─ Denied? ───→ Rate Limited (user_limit_exceeded)

    ┌─── Both Allowed ───┐
    │                     │
    ▼                     ▼
  Send Alert          Rate Limited
```

### Rule 4: Rate Limit Bypass

**No bypass mechanism** - rate limits are strictly enforced. However:

- **Escalation**: HIGH and CRITICAL severity alerts still respect rate limits
- **Emergency**: No special emergency bypass (can be added if needed)

## Rate Limit Tracking

### In-Memory Storage

The rate limiter uses in-memory storage (dictionary):
- **Key**: `camera_id` or `user_id`
- **Value**: List of alert timestamps

### Cleanup

- Automatic cleanup every 5 minutes
- Removes timestamps older than the time window
- Prevents memory growth over time

### Distributed Systems

**Current Implementation**: In-memory (single instance)

**Production Recommendation**: Use Redis for distributed rate limiting:

```python
# Example Redis-based rate limiter
redis.zadd(f"rate_limit:camera:{camera_id}", {timestamp: timestamp})
redis.zremrangebyscore(f"rate_limit:camera:{camera_id}", 0, current_time - 60)
count = redis.zcard(f"rate_limit:camera:{camera_id}")
```

## Rate Limit Response

When rate-limited, the orchestrator:

1. **Rejects the alert** (does not send)
2. **Logs the event** with reason
3. **Records metric**: `alerts_rate_limited_total{reason, tenant_id}`
4. **Returns result** with `rate_limited: true` and `rate_limit_reason`

## Configuration Recommendations

### Development
- Camera: 5/min
- User: 10/min

### Production (High Traffic)
- Camera: 10/min
- User: 20/min

### Production (Low Traffic)
- Camera: 3/min
- User: 5/min

### High-Severity Sites
- Camera: 15/min
- User: 30/min

## Monitoring

Monitor rate limiting with metrics:

- `alerts_rate_limited_total{reason, tenant_id}`: Count of rate-limited alerts
- `alerts_orchestrated_total{severity, tenant_id, success}`: Total alerts (including rate-limited)

**Alert if rate limiting exceeds 10% of alerts** - may indicate:
- Camera misconfiguration
- Rate limits too low
- System issues causing duplicate alerts

