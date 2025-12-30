# Metrics Reference

Complete reference for all Prometheus metrics across services.

## Overview

All services expose Prometheus metrics on `/metrics` endpoint (default port: 8000).

## Service: Camera Ingest Service

### Metrics

#### `camera_status_total`
**Type**: Gauge  
**Labels**: `camera_id`, `status` (RUNNING, FAILING, DEGRADED)  
**Description**: Current status of each camera

#### `frames_pushed_total`
**Type**: Counter  
**Labels**: `camera_id`, `tenant_id`  
**Description**: Total frames pushed to Redis Streams

#### `frames_dropped_total`
**Type**: Counter  
**Labels**: `camera_id`, `tenant_id`, `reason` (backlog_overflow, stale_frame)  
**Description**: Total frames dropped due to backpressure

#### `redis_stream_length`
**Type**: Gauge  
**Labels**: `stream_key`, `tenant_id`, `camera_id`  
**Description**: Current length of Redis stream (queue depth)

#### `ffmpeg_restarts_total`
**Type**: Counter  
**Labels**: `camera_id`  
**Description**: Total number of FFmpeg process restarts

## Service: Detection Service

### Metrics

#### `frames_processed_total`
**Type**: Counter  
**Labels**: `camera_id`, `tenant_id`, `model_name`, `device` (cpu, cuda)  
**Description**: Total frames processed by detection service

#### `frames_dropped_total`
**Type**: Counter  
**Labels**: `camera_id`, `tenant_id`, `reason` (stale_frame)  
**Description**: Total frames dropped (stale frames)

#### `inference_latency_ms`
**Type**: Histogram  
**Labels**: `model_name`, `device`, `camera_id`  
**Buckets**: [100, 500, 1000, 2000, 5000]  
**Description**: Inference latency in milliseconds

#### `gpu_batch_size`
**Type**: Histogram  
**Labels**: `model_name`, `device`  
**Buckets**: [1, 2, 4, 8, 16]  
**Description**: GPU batch size (only for GPU mode)

#### `gpu_batch_latency_ms`
**Type**: Histogram  
**Labels**: `model_name`, `device`  
**Buckets**: [50, 100, 200, 500, 1000]  
**Description**: GPU batch processing latency

#### `gpu_batches_processed_total`
**Type**: Counter  
**Labels**: `model_name`, `device`  
**Description**: Total batches processed (GPU mode)

#### `redis_stream_lag_entries`
**Type**: Gauge  
**Labels**: `stream_key`, `camera_id`, `tenant_id`  
**Description**: Number of pending entries in Redis stream (lag)

#### `detection_service_errors_total`
**Type**: Counter  
**Labels**: `error_type` (frame_load_error, inference_error, redis_error)  
**Description**: Total errors by type

## Service: Violation Engine Service

### Metrics

#### `violations_created_total`
**Type**: Counter  
**Labels**: `tenant_id`, `violation_type`, `camera_id`  
**Description**: Total violations created

#### `violations_escalated_total`
**Type**: Counter  
**Labels**: `tenant_id`, `violation_type`  
**Description**: Total violations escalated

#### `violations_resolved_total`
**Type**: Counter  
**Labels**: `tenant_id`, `violation_type`  
**Description**: Total violations resolved

#### `violation_processing_latency_ms`
**Type**: Histogram  
**Labels**: `tenant_id`  
**Buckets**: [10, 50, 100, 500, 1000]  
**Description**: Violation processing latency

#### `violation_engine_errors_total`
**Type**: Counter  
**Labels**: `error_type` (redis_error, state_machine_error, database_error)  
**Description**: Total errors by type

## Service: Snapshot Service

### Metrics

#### `snapshots_captured_total`
**Type**: Counter  
**Labels**: `snapshot_type` (snapshot, clip), `tenant_id`  
**Description**: Total snapshots captured

#### `snapshot_capture_latency_ms`
**Type**: Histogram  
**Labels**: `snapshot_type`  
**Buckets**: [100, 500, 1000, 2000, 5000, 10000]  
**Description**: Snapshot capture latency

#### `snapshot_upload_latency_ms`
**Type**: Histogram  
**Labels**: `snapshot_type`  
**Buckets**: [100, 500, 1000, 2000, 5000, 10000]  
**Description**: S3 upload latency

#### `snapshot_service_errors_total`
**Type**: Counter  
**Labels**: `error_type` (capture_error, upload_error, s3_error)  
**Description**: Total errors by type

## Service: Alert Orchestrator Service

### Metrics

#### `alerts_orchestrated_total`
**Type**: Counter  
**Labels**: `severity` (MEDIUM, HIGH, CRITICAL), `tenant_id`, `success` (true, false)  
**Description**: Total alerts orchestrated

#### `alerts_rate_limited_total`
**Type**: Counter  
**Labels**: `reason` (camera_limit_exceeded, user_limit_exceeded), `tenant_id`  
**Description**: Total alerts rate-limited

#### `alerts_escalated_total`
**Type**: Counter  
**Labels**: `tenant_id`  
**Description**: Total alerts escalated

#### `alert_orchestration_latency_ms`
**Type**: Histogram  
**Labels**: None  
**Buckets**: [100, 500, 1000, 2000, 5000]  
**Description**: Alert orchestration latency

#### `alert_retry_attempts_total`
**Type**: Counter  
**Labels**: `channel` (socketio, email, sms), `tenant_id`  
**Description**: Total retry attempts for alerts

#### `alert_channel_errors_total`
**Type**: Counter  
**Labels**: `channel`, `error_type`  
**Description**: Total channel errors by type

## Service: Alerts Service

### Metrics

#### `alerts_sent_total`
**Type**: Counter  
**Labels**: `channel` (websocket, email, sms), `tenant_id`, `state` (ACTIVE, ESCALATED)  
**Description**: Total alerts sent

#### `alerts_acknowledged_total`
**Type**: Counter  
**Labels**: `tenant_id`  
**Description**: Total alerts acknowledged

#### `alerts_escalated_total`
**Type**: Counter  
**Labels**: `tenant_id`  
**Description**: Total alerts escalated

#### `alert_send_latency_ms`
**Type**: Histogram  
**Labels**: None  
**Buckets**: [100, 500, 1000, 2000, 5000]  
**Description**: Alert send latency

## Service: Acknowledgement Service

### Metrics

#### `acknowledgements_created_total`
**Type**: Counter  
**Labels**: `method` (web, email_link, sms), `tenant_id`  
**Description**: Total acknowledgements created

#### `acknowledgement_processing_latency_ms`
**Type**: Histogram  
**Labels**: None  
**Buckets**: [100, 500, 1000, 2000]  
**Description**: Acknowledgement processing latency

## Service: Streaming Service

### Metrics

#### `streams_active_total`
**Type**: Gauge  
**Labels**: `protocol` (webrtc, ll_hls), `worksite_id`  
**Description**: Current number of active streams

#### `stream_uptime_seconds`
**Type**: Histogram  
**Labels**: `camera_id`, `protocol`  
**Buckets**: [60, 300, 900, 3600, 86400]  
**Description**: Stream uptime distribution

#### `stream_restarts_total`
**Type**: Counter  
**Labels**: `camera_id`, `protocol`  
**Description**: Total stream restarts

#### `stream_availability`
**Type**: Gauge  
**Labels**: `camera_id`, `protocol`  
**Description**: Stream availability (1 = available, 0 = unavailable)

## Common Metrics (All Services)

### Process Metrics

#### `process_cpu_seconds_total`
**Type**: Counter  
**Description**: Total CPU time used (exposed by Prometheus client library)

#### `process_resident_memory_bytes`
**Type**: Gauge  
**Description**: Resident memory size in bytes (exposed by Prometheus client library)

#### `process_open_fds`
**Type**: Gauge  
**Description**: Number of open file descriptors (exposed by Prometheus client library)

#### `process_start_time_seconds`
**Type**: Gauge  
**Description**: Start time of the process (exposed by Prometheus client library)

### HTTP Metrics

#### `http_requests_total`
**Type**: Counter  
**Labels**: `method`, `endpoint`, `status_code`  
**Description**: Total HTTP requests (if using Prometheus HTTP middleware)

#### `http_request_duration_seconds`
**Type**: Histogram  
**Labels**: `method`, `endpoint`  
**Description**: HTTP request duration (if using Prometheus HTTP middleware)

## Metric Naming Conventions

- Counters: `*_total` suffix
- Gauges: No suffix (or descriptive name)
- Histograms: `*_ms`, `*_seconds`, `*_bytes` suffix
- Labels: snake_case
- Metric names: snake_case

## Label Cardinality

**High Cardinality Labels** (use sparingly):
- `camera_id`
- `violation_id`
- `user_id`

**Low Cardinality Labels** (safe to use):
- `tenant_id`
- `worksite_id`
- `protocol`
- `severity`
- `state`

## Export Configuration

All services expose metrics on:
- **Endpoint**: `/metrics`
- **Port**: Configurable via `METRICS_PORT` (default: 8000)
- **Format**: Prometheus text format

