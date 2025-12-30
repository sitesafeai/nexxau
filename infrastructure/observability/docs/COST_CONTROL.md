# Cost Control and Graceful Degradation

Documentation for cost control mechanisms and graceful degradation rules.

## Overview

The platform implements cost control and graceful degradation to:
- Reduce costs under load
- Prevent resource exhaustion
- Maintain service availability
- Provide fallback modes

## Cost Control Rules

### 1. FPS Reduction Under Load

**Service**: Camera Ingest Service  
**Purpose**: Reduce frame capture rate when system is under load

**Rules**:
- **Normal Operation**: Max FPS (default: 10 FPS)
- **Under Load**: Reduce FPS by reduction factor (default: 50%)
- **Minimum FPS**: Never go below minimum (default: 0.5 FPS)

**Load Indicators**:
- CPU usage > 80%
- Memory usage > 80%
- Frame backlog > 15 frames

**Configuration**:
```bash
FPS_CONTROL_MIN=0.5              # Minimum FPS
FPS_CONTROL_MAX=10.0             # Maximum FPS
FPS_CONTROL_REDUCTION_FACTOR=0.5 # Reduce by 50% under load
FPS_CONTROL_CPU_THRESHOLD=0.8    # Reduce if CPU > 80%
FPS_CONTROL_MEMORY_THRESHOLD=0.8 # Reduce if memory > 80%
FPS_CONTROL_BACKLOG_THRESHOLD=15 # Reduce if backlog > 15
```

**Behavior**:
- FPS reduced gradually when load detected
- FPS increased gradually when load decreases
- Automatic recovery when load normalizes

### 2. GPU Saturation Frame Dropping

**Service**: Detection Service  
**Purpose**: Drop frames when GPU is saturated to prevent backlog

**Rules**:
- **Warning Threshold**: 100 entries lag → 10% drop probability
- **Critical Threshold**: 500 entries lag → 50% drop probability
- **Maximum Drop**: Never exceed 90% drop probability
- **CPU Mode**: No frame dropping (CPU processes sequentially)

**Drop Probability Curve**:
```
Lag < 100:    0% drop probability
Lag = 100:    10% drop probability
Lag = 500:    50% drop probability
Lag > 500:    50-90% drop probability (capped)
```

**Configuration**:
```bash
GPU_SATURATION_LAG_WARNING=100      # Warning threshold
GPU_SATURATION_LAG_CRITICAL=500     # Critical threshold
GPU_SATURATION_DROP_PROB_100=0.1    # 10% drop at warning
GPU_SATURATION_DROP_PROB_500=0.5    # 50% drop at critical
GPU_SATURATION_MAX_DROP=0.9         # Max 90% drop
```

**Behavior**:
- Linear interpolation between thresholds
- Random frame dropping (probabilistic)
- Only applies to GPU mode (cuda)
- Logs dropped frames for monitoring

### 3. SMS Per-Tenant Capping

**Service**: Alert Orchestrator Service  
**Purpose**: Cap SMS messages per tenant to control costs

**Rules**:
- **Hourly Limit**: Max SMS per tenant per hour (default: 100)
- **Daily Limit**: Max SMS per tenant per day (default: 1000)
- **Warning**: Warn at 80% of limit
- **Enforcement**: Reject SMS when limit exceeded

**Configuration**:
```bash
SMS_CAP_HOURLY=100           # Max SMS per hour
SMS_CAP_DAILY=1000           # Max SMS per day
SMS_CAP_WARNING_HOURLY=0.8   # Warn at 80% hourly
SMS_CAP_WARNING_DAILY=0.8    # Warn at 80% daily
```

**Behavior**:
- Rate limiting per tenant using Redis
- Fallback to local memory if Redis unavailable
- SMS rejected with clear error message
- Warnings logged when approaching limits

### 4. Snapshot Storage Limit

**Service**: Snapshot Service  
**Purpose**: Disable snapshots when storage limit exceeded

**Rules**:
- **Storage Limit**: Maximum storage in bytes (configurable)
- **Warning Threshold**: Warn at 80% of limit
- **Disable Threshold**: Disable snapshots at 95% of limit
- **Check Interval**: Check storage every 5 minutes

**Configuration**:
```bash
SNAPSHOT_STORAGE_MAX_BYTES=0        # 0 = unlimited
SNAPSHOT_STORAGE_WARNING=0.8        # Warn at 80%
SNAPSHOT_STORAGE_DISABLE=0.95       # Disable at 95%
SNAPSHOT_STORAGE_CHECK_INTERVAL=300 # Check every 5 minutes
```

**Behavior**:
- Periodic storage usage checks
- Snapshots disabled when limit exceeded
- Automatic re-enable when usage decreases
- Fail-open on storage check errors (allow snapshots)

## Circuit Breaker Logic

### Circuit States

1. **CLOSED**: Normal operation
2. **OPEN**: Service degraded, reject requests
3. **HALF_OPEN**: Testing if service recovered

### Circuit Breaker Configuration

```python
CircuitBreakerConfig(
    failure_threshold=5,        # Open after 5 failures
    success_threshold=2,        # Close after 2 successes (half-open)
    timeout_seconds=60.0,       # Wait 60s before half-open
    failure_window_seconds=60.0 # Count failures in 60s window
)
```

### Usage

```python
from cost_control import CircuitBreaker

breaker = CircuitBreaker("snapshot-service")

try:
    result = breaker.call(snapshot_service.capture, camera_id)
except CircuitBreakerOpenError:
    # Service degraded, use fallback
    pass
```

## Fallback Modes

### 1. FPS Reduction Fallback

**Trigger**: System load detected  
**Action**: Reduce FPS automatically  
**Recovery**: Gradually increase FPS when load decreases

### 2. GPU Frame Dropping Fallback

**Trigger**: GPU lag exceeds thresholds  
**Action**: Drop frames probabilistically  
**Recovery**: Automatic when lag decreases

### 3. SMS Rate Limiting Fallback

**Trigger**: SMS limit exceeded  
**Action**: Reject SMS, return error  
**Recovery**: Reset at next time window

**Alternative Channels**:
- Use email instead of SMS when limit exceeded
- Use WebSocket notifications
- Queue SMS for later delivery

### 4. Snapshot Disable Fallback

**Trigger**: Storage limit exceeded  
**Action**: Disable snapshot capture  
**Recovery**: Re-enable when storage decreases

**Alternative**:
- Use existing snapshots from violations
- Reduce snapshot retention period
- Compress snapshots

## Metrics

### Cost Control Metrics

- `fps_current`: Current FPS (Camera Ingest)
- `frames_dropped_total{reason="gpu_saturation"}`: GPU frame drops
- `sms_rate_limited_total{tenant_id}`: SMS rate limits
- `snapshots_disabled`: Snapshot disable status (1 = disabled)

### Circuit Breaker Metrics

- `circuit_breaker_state{breaker_name}`: Circuit state (0=closed, 1=open, 2=half-open)
- `circuit_breaker_failures_total{breaker_name}`: Total failures
- `circuit_breaker_successes_total{breaker_name}`: Total successes

## Alert Rules

### Cost Control Alerts

- **High FPS Reduction**: FPS reduced below threshold
- **GPU Frame Drops**: High GPU frame drop rate
- **SMS Limit Approaching**: SMS usage > 80% of limit
- **Storage Limit Approaching**: Storage usage > 80% of limit
- **Snapshots Disabled**: Snapshots disabled due to storage

## Best Practices

1. **Monitor Metrics**: Track cost control metrics regularly
2. **Tune Thresholds**: Adjust thresholds based on actual usage
3. **Set Alerts**: Alert on cost control triggers
4. **Document Limits**: Document all limits and thresholds
5. **Test Fallbacks**: Regularly test fallback modes
6. **Review Costs**: Review costs monthly and adjust limits

## Configuration Examples

### Production Configuration

```bash
# FPS Control
FPS_CONTROL_MIN=1.0
FPS_CONTROL_MAX=10.0
FPS_CONTROL_REDUCTION_FACTOR=0.5

# GPU Saturation
GPU_SATURATION_LAG_WARNING=100
GPU_SATURATION_LAG_CRITICAL=500
GPU_SATURATION_DROP_PROB_500=0.5

# SMS Cap
SMS_CAP_HOURLY=100
SMS_CAP_DAILY=1000

# Storage Limit
SNAPSHOT_STORAGE_MAX_BYTES=1000000000000  # 1TB
SNAPSHOT_STORAGE_DISABLE=0.95
```

### Development Configuration

```bash
# More lenient limits for development
FPS_CONTROL_MIN=0.5
FPS_CONTROL_MAX=30.0
GPU_SATURATION_DROP_PROB_500=0.3
SMS_CAP_HOURLY=1000
SNAPSHOT_STORAGE_MAX_BYTES=0  # Unlimited
```

