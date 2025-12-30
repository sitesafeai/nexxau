# Alert Thresholds

Documentation for alert thresholds and recommendations.

## Alert Categories

### 1. GPU Lag Alerts

#### High GPU Lag (Warning)
- **Metric**: `redis_stream_lag_entries{device="cuda"}`
- **Threshold**: > 100 entries
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Investigate GPU processing delays

#### Critical GPU Lag (Critical)
- **Metric**: `redis_stream_lag_entries{device="cuda"}`
- **Threshold**: > 500 entries
- **Duration**: 2 minutes
- **Severity**: Critical
- **Action**: Immediate investigation, detection may be significantly delayed

**Rationale**:
- GPU lag > 100 entries indicates processing can't keep up with frame ingestion
- GPU lag > 500 entries indicates severe backlog, frames are stale
- Different thresholds for warning vs critical allow proactive intervention

### 2. Frame Backlog Alerts

#### High Frame Backlog (Warning)
- **Metric**: `redis_stream_length`
- **Threshold**: > 15 frames
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Monitor closely, frames approaching drop threshold

#### Critical Frame Backlog (Critical)
- **Metric**: `redis_stream_length`
- **Threshold**: > 18 frames
- **Duration**: 2 minutes
- **Severity**: Critical
- **Action**: Frames are being dropped, investigate detection service health

#### Excessive Frame Drops (Warning)
- **Metric**: `rate(frames_dropped_total[5m])`
- **Threshold**: > 10 drops/sec
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: High drop rate indicates system overload

**Rationale**:
- Stream max length is 20 frames
- Warning at 15 frames provides buffer before critical threshold
- Critical at 18 frames indicates imminent frame drops
- Drop rate > 10/sec indicates systemic issues

### 3. Camera Offline Alerts

#### Camera Offline (Warning)
- **Metric**: `camera_status_total{status="FAILING"}`
- **Threshold**: > 0
- **Duration**: 2 minutes
- **Severity**: Warning
- **Action**: Camera is offline, check network and camera health

#### Camera Degraded (Warning)
- **Metric**: `camera_status_total{status="DEGRADED"}`
- **Threshold**: > 0
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Camera experiencing repeated failures, investigate root cause

#### Stream Unavailable (Warning)
- **Metric**: `stream_availability`
- **Threshold**: == 0 (unavailable)
- **Duration**: 2 minutes
- **Severity**: Warning
- **Action**: Streaming service unable to provide stream, check streaming service health

**Rationale**:
- 2-minute duration prevents false alarms from transient network issues
- Degraded status requires longer duration (5 min) to confirm persistent issues
- Stream unavailability indicates streaming service problems

### 4. Alert Delivery Failure Alerts

#### High Alert Delivery Failure Rate (Warning)
- **Metric**: `rate(alerts_orchestrated_total{success="false"}[5m])`
- **Threshold**: > 0.1 failures/sec
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Alert delivery issues detected, investigate channel health

#### Critical Alert Delivery Failure Rate (Critical)
- **Metric**: `rate(alerts_orchestrated_total{success="false"}[5m])`
- **Threshold**: > 0.5 failures/sec
- **Duration**: 2 minutes
- **Severity**: Critical
- **Action**: Immediate investigation, alerts may not be reaching users

#### Channel Delivery Failure (Warning)
- **Metric**: `rate(alert_channel_errors_total[5m])`
- **Threshold**: > 0.2 errors/sec
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Specific channel has delivery issues, check channel configuration

#### Email Delivery Failure (Warning)
- **Metric**: `rate(alert_channel_errors_total{channel="email"}[5m])`
- **Threshold**: > 0.1 errors/sec
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Email delivery issues, check SMTP configuration

#### SMS Delivery Failure (Warning)
- **Metric**: `rate(alert_channel_errors_total{channel="sms"}[5m])`
- **Threshold**: > 0.1 errors/sec
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: SMS delivery issues, check Twilio configuration

**Rationale**:
- 0.1 failures/sec = 6 failures/min (acceptable for small sites)
- 0.5 failures/sec = 30 failures/min (critical for large sites)
- Channel-specific thresholds allow targeted investigation

### 5. Service Health Alerts

#### Service Down (Critical)
- **Metric**: `up{job=~"...services..."}`
- **Threshold**: == 0 (down)
- **Duration**: 1 minute
- **Severity**: Critical
- **Action**: Service is down, immediate restart/investigation required

#### High Error Rate (Warning)
- **Metric**: `rate(*_errors_total[5m])`
- **Threshold**: > 1 error/sec (varies by service)
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Service experiencing errors, investigate logs

#### High Memory Usage (Warning)
- **Metric**: `process_resident_memory_bytes`
- **Threshold**: > 2GB
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Service using excessive memory, may need scaling

#### High CPU Usage (Warning)
- **Metric**: `rate(process_cpu_seconds_total[5m])`
- **Threshold**: > 0.8 (80% CPU)
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Service using excessive CPU, may need scaling

**Rationale**:
- Service down requires immediate action (1 min duration)
- Error rates > 1/sec indicate systemic issues
- Memory/CPU thresholds prevent resource exhaustion

## Threshold Tuning

### Factors to Consider

1. **Site Size**:
   - Small sites: Lower thresholds (fewer cameras = lower baseline)
   - Large sites: Higher thresholds (more cameras = higher baseline)

2. **Service Load**:
   - Peak hours: Adjust thresholds for expected load
   - Off-peak hours: Lower thresholds for tighter monitoring

3. **Business Requirements**:
   - Safety-critical: Lower thresholds, faster alerts
   - Standard monitoring: Standard thresholds

### Recommended Thresholds by Site Size

#### Small Sites (<10 cameras)

- GPU Lag Warning: 50 entries (instead of 100)
- GPU Lag Critical: 200 entries (instead of 500)
- Frame Backlog Warning: 10 frames (instead of 15)
- Alert Delivery Failure: 0.05/sec (instead of 0.1/sec)

#### Large Sites (≥10 cameras)

- GPU Lag Warning: 100 entries (default)
- GPU Lag Critical: 500 entries (default)
- Frame Backlog Warning: 15 frames (default)
- Alert Delivery Failure: 0.1/sec (default)

## Alert Routing

### Severity Levels

- **Critical**: Immediate response required (pager, SMS)
- **Warning**: Response within business hours (email, Slack)

### Alert Channels

- **Critical Alerts**: 
  - PagerDuty / OpsGenie
  - SMS (on-call engineer)
  - Slack #critical-alerts channel

- **Warning Alerts**:
  - Email (on-call team)
  - Slack #alerts channel
  - Grafana notification

## Alert Response Playbook

### GPU Lag

1. Check GPU utilization
2. Check detection service logs
3. Verify model performance
4. Consider scaling detection service

### Frame Backlog

1. Check detection service health
2. Verify Redis connectivity
3. Check camera ingest service logs
4. Consider scaling detection service

### Camera Offline

1. Check camera network connectivity
2. Verify RTSP URL accessibility
3. Check camera ingest service logs
4. Verify camera device status

### Alert Delivery Failure

1. Check alert orchestrator logs
2. Verify channel credentials (SMTP, Twilio)
3. Check rate limiting status
4. Verify network connectivity to channels

