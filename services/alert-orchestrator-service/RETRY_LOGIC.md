# Retry Logic Documentation

Documentation for retry logic with exponential backoff in the Alert Orchestrator.

## Overview

The Alert Orchestrator implements retry logic with exponential backoff to handle transient failures in alert delivery. Each channel (Socket.IO, Email, SMS) is retried independently if delivery fails.

## Retry Configuration

### Default Configuration

- **Max Attempts**: 3 (configurable via `RETRY_MAX_ATTEMPTS`)
- **Initial Backoff**: 1.0 seconds (configurable via `RETRY_INITIAL_BACKOFF_SECONDS`)
- **Max Backoff**: 60.0 seconds (configurable via `RETRY_MAX_BACKOFF_SECONDS`)
- **Backoff Multiplier**: 2.0 (configurable via `RETRY_BACKOFF_MULTIPLIER`)
- **Jitter**: Enabled (adds random 0-25% to prevent thundering herd)

### Configuration Example

```bash
# Environment variables
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_BACKOFF_SECONDS=1.0
RETRY_MAX_BACKOFF_SECONDS=60.0
RETRY_BACKOFF_MULTIPLIER=2.0
```

## Exponential Backoff Formula

### Calculation

```
backoff = initial_backoff * (multiplier ^ (attempt - 1))
backoff = min(backoff, max_backoff)
backoff = backoff + random_jitter  # if jitter enabled
```

### Example Timeline

With default settings (initial=1.0, multiplier=2.0, max=60.0):

```
Attempt 1: backoff = 1.0 * (2.0 ^ 0) = 1.0s
Attempt 2: backoff = 1.0 * (2.0 ^ 1) = 2.0s
Attempt 3: backoff = 1.0 * (2.0 ^ 2) = 4.0s
Attempt 4: backoff = 1.0 * (2.0 ^ 3) = 8.0s
Attempt 5: backoff = 1.0 * (2.0 ^ 4) = 16.0s
...
Attempt N: backoff = min(calculated, 60.0s)
```

### With Jitter

Jitter adds random value between 0-25% of backoff:

```
Attempt 1: backoff = 1.0s + random(0, 0.25s) = 1.0-1.25s
Attempt 2: backoff = 2.0s + random(0, 0.5s) = 2.0-2.5s
Attempt 3: backoff = 4.0s + random(0, 1.0s) = 4.0-5.0s
```

## Retry Flow

```
Send Alert to Channel
    │
    ├─ Success → Return Success ✓
    │
    └─ Failure
        │
        ├─ Attempt 1 → Wait 1s → Retry
        │   ├─ Success → Return Success ✓
        │   └─ Failure → Continue
        │
        ├─ Attempt 2 → Wait 2s → Retry
        │   ├─ Success → Return Success ✓
        │   └─ Failure → Continue
        │
        ├─ Attempt 3 → Wait 4s → Retry
        │   ├─ Success → Return Success ✓
        │   └─ Failure → Return Failure ✗
        │
        └─ Log Failure
```

## Retry Behavior

### Per-Channel Retries

Each channel is retried independently:

```
Alert with 3 channels:
    │
    ├─ Socket.IO: Attempt 1 ✗ → Attempt 2 ✓ (Success)
    ├─ Email:     Attempt 1 ✓ (Success)
    └─ SMS:       Attempt 1 ✗ → Attempt 2 ✗ → Attempt 3 ✗ (Failed)

Result: 2 channels succeeded, 1 failed
```

### Failure Conditions

An alert is considered failed if:
- Network error (connection timeout, DNS failure)
- Service error (SMTP server error, Twilio API error)
- Authentication error (invalid credentials)
- Rate limit error from downstream service

**Not retried**:
- Invalid recipient (invalid email/phone)
- Permission denied
- Configuration errors

### Success Conditions

An alert is considered successful if:
- Channel `send_alert()` returns `True`
- No exception raised
- Delivery confirmed by channel

## Failure Logging

### Logging on Failure

When all retries are exhausted:

1. **Structured Logging**: Error logged with full context
   ```json
   {
     "level": "ERROR",
     "message": "Alert delivery failed after 3 attempts",
     "violation_id": "...",
     "channel": "sms",
     "attempts": 3,
     "error": "...",
     "context": {...}
   }
   ```

2. **Metrics**: Failure tracked in metrics
   - `alert_retry_attempts_total{channel, tenant_id}`

3. **Context**: Includes violation_id, channel, severity, error details

### Logging on Success After Retries

When alert succeeds after retries:

1. **Info Logging**: Success logged with retry count
   ```json
   {
     "level": "INFO",
     "message": "Alert delivery succeeded after retries",
     "violation_id": "...",
     "channel": "email",
     "attempt": 2
   }
   ```

## Configuration Recommendations

### Conservative (Default)
- Max Attempts: 3
- Initial Backoff: 1.0s
- Max Backoff: 60.0s
- Multiplier: 2.0
- **Use Case**: Standard production environments

### Aggressive
- Max Attempts: 5
- Initial Backoff: 0.5s
- Max Backoff: 30.0s
- Multiplier: 1.5
- **Use Case**: High-reliability requirements, tolerant of delays

### Quick Fail
- Max Attempts: 2
- Initial Backoff: 0.5s
- Max Backoff: 5.0s
- Multiplier: 2.0
- **Use Case**: Fast feedback, low latency requirements

## Best Practices

### 1. Idempotency

Ensure channel `send_alert()` is idempotent:
- Same alert sent multiple times should not cause duplicates
- Use unique `violation_id` to deduplicate

### 2. Timeout Configuration

Set appropriate timeouts per channel:
- Socket.IO: 5 seconds
- Email (SMTP): 10 seconds
- SMS (Twilio): 5 seconds

### 3. Circuit Breaker

Consider adding circuit breaker pattern:
- If channel fails repeatedly, stop retrying temporarily
- Resume after cooldown period

### 4. Monitoring

Monitor retry metrics:
- `alert_retry_attempts_total`: Track retry frequency
- Alert if retry rate > 10% of alerts

## Example Scenarios

### Scenario 1: Transient Network Error

```
Attempt 1: Connection timeout (network issue)
  → Wait 1s
Attempt 2: Success ✓
  → Alert delivered
```

### Scenario 2: Service Temporarily Unavailable

```
Attempt 1: SMTP server 503 error
  → Wait 1s
Attempt 2: SMTP server 503 error
  → Wait 2s
Attempt 3: Success ✓
  → Alert delivered
```

### Scenario 3: Persistent Failure

```
Attempt 1: Invalid credentials error
  → Wait 1s
Attempt 2: Invalid credentials error
  → Wait 2s
Attempt 3: Invalid credentials error
  → Log failure, return failure ✗
```

## Implementation Details

### RetryHandler Class

```python
retry_handler = RetryHandler(
    max_attempts=3,
    initial_backoff_seconds=1.0,
    max_backoff_seconds=60.0,
    backoff_multiplier=2.0,
    enable_jitter=True
)

success, error = retry_handler.execute_with_retry(
    func=channel.send_alert,
    operation_name="send_alert_email",
    context={'violation_id': '...'}
)
```

### Integration

Retry logic is integrated into `AlertOrchestrator.send_alert()`:

```python
# For each channel
success, error = self.retry_handler.execute_with_retry(
    func=send_func,
    operation_name=f"send_alert_{channel_name}",
    context={'violation_id': violation_id, 'channel': channel_name}
)
```

