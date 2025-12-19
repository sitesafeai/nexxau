# Safety Systems Implementation

## Overview
Production-grade, failure-tolerant safety systems implemented per SYSTEM DIRECTIVE.

## ✅ Completed Systems

### 1. Camera Watchdog & Circuit Breaker (`app/lib/safety/camera-watchdog.ts`)
- **Per-camera health monitoring** with isolated execution contexts
- **Automatic status transitions**: HEALTHY → DEGRADED → FAILED → DISABLED
- **Circuit breaker pattern**: Auto-disables cameras after persistent failures
- **Explicit re-enable required**: Cameras don't auto-recover
- **Failure isolation**: One camera failure doesn't cascade to others
- **Health check intervals**: Periodic monitoring with configurable thresholds

**Key Features:**
- Tracks consecutive failures, total frames, failed frames
- Configurable thresholds (default: 5 failures → DEGRADED, 30s → FAILED)
- Database integration for status persistence
- Audit logging for all state changes

### 2. Frame Validation (`app/lib/safety/frame-validator.ts`)
- **Untrusted input validation**: Every frame validated before processing
- **Timestamp sanity checks**: Validates timestamps are within reasonable range
- **Frame shape validation**: Dimensions, aspect ratios, encoding integrity
- **DoS protection**: Limits detection count, frame size, base64 size
- **Input sanitization**: Cleans and validates all frame data
- **Deterministic hashing**: Frame hash for deduplication

**Validation Rules:**
- Camera ID: Alphanumeric, dashes, underscores only
- Timestamp: Within 7 days past, 1 hour future
- Dimensions: 64px - 8K resolution
- Detections: Max 1000 per frame
- Base64: Max 50MB

### 3. Alert State Machine (`app/lib/safety/alert-state-machine.ts`)
- **Explicit state transitions**: CREATED → ACKNOWLEDGED → RESOLVED
- **Override handling**: Append-only override history, never deleted
- **Deterministic alert keys**: SHA-256 hash for deduplication
- **State validation**: Only valid transitions allowed
- **Override expiration**: TTL-based override expiry
- **Deduplication**: Prevents duplicate alerts within 5-minute window

**State Transitions:**
```
CREATED → ACKNOWLEDGED, OVERRIDDEN, RESOLVED, ESCALATED
ACKNOWLEDGED → RESOLVED, ESCALATED, OVERRIDDEN
OVERRIDDEN → RESOLVED (only)
ESCALATED → ACKNOWLEDGED, RESOLVED, OVERRIDDEN
RESOLVED → (terminal)
```

### 4. Enhanced Retry Logic (`app/lib/retry.ts`)
- **Exponential backoff**: Configurable multiplier (default: 2x)
- **Jitter**: Random 30% jitter to prevent thundering herd
- **Rate limiting**: Max retries per second (default: 10/sec)
- **Max attempt cap**: No infinite retries (default: 3 attempts)
- **Error classification**: Retryable vs non-retryable errors
- **Reconnect storm protection**: Per-key rate limiting

**Improvements:**
- Added jitter to prevent synchronized retries
- Rate limiter prevents reconnect storms
- Better error classification
- Context-aware retry keys

### 5. Database Safety (`app/lib/safety/database-safety.ts`)
- **Transactional alert creation**: Alert + video + audit log in one transaction
- **Idempotency support**: Prevents duplicate operations
- **Soft delete**: Never hard delete, always use deletedAt
- **Reconciliation jobs**: Finds orphaned alerts, videos, cameras
- **Transaction timeouts**: Max wait and completion timeouts

**Safety Guarantees:**
- All-or-nothing alert creation
- Idempotency keys prevent duplicate operations
- Audit trail for all deletions
- Background reconciliation for data consistency

### 6. Detection Endpoint Integration (`app/api/yolo/detections/route.ts`)
- **Frame validation**: All frames validated before processing
- **Camera watchdog**: Checks camera health before processing
- **Alert deduplication**: Uses alert state machine for deduplication
- **Transactional alerts**: Alert creation is atomic
- **Failure recording**: All failures recorded to watchdog
- **Correlation IDs**: Request tracking for debugging
- **Non-blocking video**: Video capture doesn't block alert creation

**Integration Points:**
1. Frame validation on input
2. Camera health check before processing
3. Valid frame recording to watchdog
4. Alert key generation for deduplication
5. Transactional alert creation
6. Failure recording on errors

### 6. API Versioning & Correlation IDs (`app/lib/safety/api-versioning.ts`)
- **Strict versioning**: Support for multiple API versions
- **Correlation IDs**: Every request gets unique tracking ID
- **Standardized error schema**: Consistent error responses
- **Version negotiation**: Client specifies version via headers
- **Backward compatibility**: Handle old API versions gracefully

**Features:**
- Version parsing from headers/query params
- Supported versions: 1.0.0, 1.1.0
- Correlation ID extraction from headers or generation
- Standardized success/error response formats
- Error code mapping

### 7. Inference Timeout & GPU Safety (`app/lib/safety/inference-timeout.ts`)
- **Hard timeouts**: Inference wrapped in timeout promises
- **GPU OOM detection**: Detects and handles out-of-memory errors
- **Automatic retries**: With exponential backoff
- **Health monitoring**: Tracks inference failures per worksite
- **Circuit breaker**: Skip inference if too many failures

**Safety Features:**
- Default 5-second timeout (configurable)
- GPU memory monitoring
- Automatic garbage collection on OOM
- Per-worksite failure tracking
- Auto-disable inference after threshold

### 8. Observability & Monitoring (`app/lib/safety/observability.ts`)
- **Frame drop rate**: Per-camera tracking
- **Inference latency**: Percentile tracking (p50, p90, p95, p99)
- **Alert delay**: Time from creation to detection
- **Override frequency**: Track override patterns
- **Error budget**: Errors per hour per worksite

**Metrics Tracked:**
- Frame drops with reasons
- Inference latency with success/failure
- Alert delays (creation → detection)
- Alert overrides
- Errors with context

### 9. Environment Validation (`app/lib/safety/env-validation.ts`)
- **Startup validation**: Checks all required env vars
- **Format validation**: Validates env var formats
- **Common issue detection**: Finds misconfigurations
- **Warning system**: Alerts on optional but recommended vars

**Validation:**
- Required vars: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- Optional vars: Twilio, AI service, Sentry, Cloudinary
- Format checks: URL formats, secret lengths
- Production checks: No localhost in prod, SSL requirements

### 10. API Middleware (`app/lib/safety/api-middleware.ts`)
- **Request wrapping**: Standardized API route handler
- **Automatic correlation IDs**: Added to all responses
- **Error handling**: Catches and formats errors
- **Request logging**: Logs all API requests with latency
- **Version validation**: Checks API version on every request

## ⏳ Pending Implementation

### 11. Queue System with Backpressure
- Idempotent consumers
- Dead-letter queue
- Per-site rate limiting
- TTL-based frame expiration

### 10. Queueing & Backpressure
- Idempotent consumers
- Dead-letter queue
- Per-site rate limiting
- TTL-based frame expiration

### 11. Authorization Safety
- Permission checks on every action
- Token expiration handling
- Role change invalidation

## Usage Examples

### Camera Watchdog
```typescript
import { cameraWatchdog } from '@/app/lib/safety';

// Record valid frame
cameraWatchdog.recordValidFrame(cameraId, new Date());

// Record failure
cameraWatchdog.recordFailedFrame(cameraId, 'Frame decode failed');

// Check health
if (cameraWatchdog.isCameraHealthy(cameraId)) {
  // Process frame
}

// Manually disable
await cameraWatchdog.disableCamera(cameraId, 'Manual disable by admin');
```

### Frame Validation
```typescript
import { FrameValidator } from '@/app/lib/safety';

const result = FrameValidator.validateFrame(frameData);
if (!result.isValid) {
  return { error: result.errors };
}
const sanitized = result.sanitizedData;
```

### Alert State Machine
```typescript
import { AlertStateMachine } from '@/app/lib/safety';

// Generate alert key
const alertKey = AlertStateMachine.generateAlertKey({
  cameraId: 'cam123',
  violationType: 'zone_violation',
  timestamp: new Date(),
});

// Check if should create
const shouldCreate = await AlertStateMachine.shouldCreateAlert(alertKey);
if (!shouldCreate.shouldCreate) {
  // Skip duplicate
}

// Override alert
await AlertStateMachine.overrideAlert(alertId, userId, 'False positive', expiresAt);
```

### Enhanced Retry
```typescript
import { retry } from '@/app/lib/retry';

await retry(
  () => someOperation(),
  {
    maxAttempts: 3,
    jitter: true,
    rateLimitPerSecond: 10,
  },
  'operation-context'
);
```

## Next Steps

1. **Complete API versioning** - Add version headers and routing
2. **Implement observability hooks** - Metrics collection and alerting
3. **Add inference timeouts** - Wrap all inference calls
4. **Queue system** - Implement backpressure and dead-letter queue
5. **Authorization hardening** - Add permission checks everywhere

## Testing Recommendations

1. **Camera Watchdog**: Test failure scenarios, circuit breaker behavior
2. **Frame Validation**: Test malformed inputs, DoS attempts
3. **Alert State Machine**: Test state transitions, override expiration
4. **Retry Logic**: Test rate limiting, jitter distribution
5. **Database Safety**: Test transaction rollbacks, idempotency

## Monitoring

Key metrics to track:
- Camera health status distribution
- Frame validation failure rate
- Alert deduplication rate
- Retry success rate
- Transaction failure rate
- Override frequency

