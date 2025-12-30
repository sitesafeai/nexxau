# Observability Infrastructure

Observability setup for the PPE Detection Platform with Prometheus metrics, Grafana dashboards, and alert rules.

## Overview

This directory contains:
- **Metrics Reference**: Complete list of all Prometheus metrics
- **Grafana Dashboards**: Pre-configured dashboards for monitoring
- **Alert Rules**: Prometheus alert rules with thresholds
- **Documentation**: Alert thresholds and tuning guides

## Components

### Prometheus

**Configuration**: `prometheus/prometheus.yml`

Scrapes metrics from all services:
- Camera Ingest Service (port 8000)
- Detection Service (port 8000)
- Violation Engine Service (port 8000)
- Snapshot Service (port 8000)
- Alert Orchestrator Service (port 8000)
- Alerts Service (port 8000)
- Acknowledgement Service (port 8000)
- Streaming Service (port 8000)

### Grafana Dashboards

**Location**: `grafana/dashboards/`

Pre-configured dashboards:
1. **Platform Overview**: High-level platform health and metrics
2. **Detection Service**: Detection-specific metrics and latency
3. **Camera Ingest**: Camera status, frame backlog, and drops
4. **Alerts & Notifications**: Alert delivery and channel health

### Alert Rules

**Location**: `prometheus/alerts/alerts.yml`

Alert categories:
1. **GPU Lag**: High/Critical GPU processing delays
2. **Frame Backlog**: High frame backlog and drops
3. **Camera Offline**: Camera and stream unavailability
4. **Alert Delivery Failure**: Alert delivery issues
5. **Service Health**: Service down and resource usage

## Quick Start

### 1. Deploy Prometheus

```bash
# Copy Prometheus configuration
cp prometheus/prometheus.yml /etc/prometheus/
cp prometheus/alerts/alerts.yml /etc/prometheus/rules/

# Start Prometheus
docker run -d \
  -p 9090:9090 \
  -v /etc/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v /etc/prometheus/rules:/etc/prometheus/rules \
  prom/prometheus
```

### 2. Deploy Grafana

```bash
# Start Grafana
docker run -d \
  -p 3000:3000 \
  -v grafana-dashboards:/var/lib/grafana/dashboards \
  grafana/grafana

# Import dashboards
# Use Grafana UI or API to import dashboard JSON files
```

### 3. Configure Services

All services expose metrics on `/metrics` endpoint (port 8000 by default).

Verify metrics are accessible:
```bash
curl http://detection-service:8000/metrics
curl http://camera-ingest-service:8000/metrics
```

### 4. Set Up Alertmanager

```yaml
# alertmanager.yml
route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'critical'
    # PagerDuty, SMS, etc.
  - name: 'warning'
    # Email, Slack, etc.
```

## Metrics Reference

See [docs/METRICS_REFERENCE.md](./docs/METRICS_REFERENCE.md) for complete metrics list.

**Key Metrics**:
- `frames_processed_total`: Detection throughput
- `inference_latency_ms`: Detection latency
- `redis_stream_lag_entries`: GPU lag
- `redis_stream_length`: Frame backlog
- `camera_status_total`: Camera health
- `alerts_orchestrated_total`: Alert delivery
- `stream_availability`: Stream health

## Alert Thresholds

See [docs/ALERT_THRESHOLDS.md](./docs/ALERT_THRESHOLDS.md) for detailed thresholds.

**Key Alerts**:
- **GPU Lag**: > 100 entries (warning), > 500 entries (critical)
- **Frame Backlog**: > 15 frames (warning), > 18 frames (critical)
- **Camera Offline**: Status = FAILING for 2 minutes
- **Alert Delivery Failure**: > 0.1 failures/sec (warning), > 0.5 failures/sec (critical)

## Dashboards

### Platform Overview

- Service health status
- Total cameras and active streams
- Frames processed rate
- Detection latency
- Redis stream lag
- Frame backlog

### Detection Service

- Frames processed and dropped
- Inference latency (p50, p95)
- GPU batch size
- Redis stream lag
- Error rates

### Camera Ingest

- Camera status distribution
- Frames pushed rate
- Frame backlog
- Frames dropped
- FFmpeg restarts
- Offline cameras table

### Alerts & Notifications

- Alerts sent rate
- Alert delivery success rate
- Alert delivery failures
- Rate-limited alerts
- Channel delivery errors
- Alert retry attempts
- Acknowledgements

## Customization

### Adjusting Thresholds

Edit `prometheus/alerts/alerts.yml` and update threshold values:

```yaml
- alert: HighGPULag
  expr: redis_stream_lag_entries{device="cuda"} > 100  # Adjust threshold
  for: 5m  # Adjust duration
```

### Adding Dashboards

1. Create dashboard JSON in `grafana/dashboards/`
2. Import via Grafana UI or API
3. Update dashboard tags for organization

### Adding Metrics

1. Add metric to service code (using Prometheus client library)
2. Document in `docs/METRICS_REFERENCE.md`
3. Add to relevant dashboards
4. Create alerts if needed

## Monitoring Best Practices

1. **Baseline Metrics**: Establish baseline values during normal operation
2. **Alert Tuning**: Adjust thresholds based on observed behavior
3. **Dashboard Organization**: Group related metrics together
4. **Alert Fatigue**: Avoid too many alerts, focus on actionable ones
5. **Documentation**: Document alert response procedures

## Troubleshooting

### Metrics Not Appearing

1. Verify service is exposing metrics on `/metrics` endpoint
2. Check Prometheus scrape configuration
3. Verify network connectivity between Prometheus and services
4. Check Prometheus targets page for scrape errors

### Alerts Not Firing

1. Verify alert rules are loaded (Prometheus rules page)
2. Check alert expression syntax
3. Verify metric names match (case-sensitive)
4. Check alert evaluation interval

### Dashboards Not Loading

1. Verify Prometheus data source is configured in Grafana
2. Check dashboard JSON syntax
3. Verify metric names in dashboard match actual metrics
4. Check Grafana logs for errors

