# Grafana Dashboard Guide

Guide for using and customizing Grafana dashboards.

## Available Dashboards

### 1. Platform Overview

**Purpose**: High-level platform health and key metrics

**Panels**:
- Service Health: Status of all services
- Total Cameras: Count of active cameras
- Active Streams: Number of active video streams
- Active Violations: Current violation count
- Frames Processed: Detection throughput
- Detection Latency: Inference latency (p50, p95)
- Redis Stream Lag: GPU lag monitoring
- Frame Backlog: Frame queue depth

**Use Cases**:
- Executive dashboard
- Overall platform health
- Quick problem identification

### 2. Detection Service

**Purpose**: Deep dive into detection service metrics

**Panels**:
- Frames Processed: Throughput per camera
- Frames Dropped: Drop rate and reasons
- Inference Latency: P50 and P95 latency
- GPU Batch Size: Batch size distribution
- Redis Stream Lag: GPU lag monitoring (with alert)
- Error Rate: Error breakdown by type

**Use Cases**:
- Performance optimization
- GPU utilization monitoring
- Detection quality analysis

### 3. Camera Ingest Service

**Purpose**: Camera and frame ingestion monitoring

**Panels**:
- Camera Status: Status distribution (pie chart)
- Frames Pushed: Frame ingestion rate
- Frame Backlog: Queue depth (with alert)
- Frames Dropped: Drop rate by reason
- FFmpeg Restarts: Restart frequency
- Offline Cameras: Table of offline cameras

**Use Cases**:
- Camera health monitoring
- Frame ingestion troubleshooting
- Network issue detection

### 4. Alerts & Notifications

**Purpose**: Alert delivery and notification channel health

**Panels**:
- Alerts Sent: Alert send rate by severity
- Alert Delivery Success Rate: Success percentage
- Alert Delivery Failures: Failure rate (with alert)
- Rate Limited Alerts: Rate limiting frequency
- Channel Delivery Errors: Errors by channel
- Alert Retry Attempts: Retry frequency
- Acknowledgements: Acknowledgement rate by method

**Use Cases**:
- Alert delivery monitoring
- Channel health tracking
- Notification reliability analysis

### 5. Violation Engine Service

**Purpose**: Violation processing and state transitions

**Panels**:
- Violations Created: Violation creation rate
- Violation State Transitions: Created/Escalated/Resolved rates
- Processing Latency: Violation processing latency
- Error Rate: Error breakdown by type

**Use Cases**:
- Violation processing analysis
- State transition monitoring
- Performance optimization

### 6. Streaming Service

**Purpose**: Video streaming health and availability

**Panels**:
- Active Streams: Total active streams
- Streams by Protocol: WebRTC vs LL-HLS distribution
- Stream Availability: Availability per camera
- Stream Restarts: Restart frequency
- Stream Uptime: Uptime distribution
- Unavailable Streams: Table of unavailable streams

**Use Cases**:
- Streaming service monitoring
- Protocol performance analysis
- Stream reliability tracking

## Dashboard Import

### Via Grafana UI

1. Open Grafana (http://localhost:3000)
2. Go to Dashboards → Import
3. Upload dashboard JSON file
4. Select Prometheus data source
5. Click Import

### Via Grafana API

```bash
# Import dashboard
curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana/dashboards/platform-overview.json
```

### Via Provisioning

Place dashboard JSON files in Grafana provisioning directory:

```yaml
# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: 'PPE Detection'
    orgId: 1
    folder: 'PPE Detection'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/dashboards
```

## Customization

### Adding Panels

1. Edit dashboard JSON file
2. Add panel definition to `panels` array
3. Set `gridPos` for panel position and size
4. Define targets (Prometheus queries)
5. Import updated dashboard

### Modifying Queries

Edit `targets` array in panel definition:

```json
{
  "targets": [
    {
      "expr": "rate(frames_processed_total[5m])",
      "legendFormat": "{{camera_id}}"
    }
  ]
}
```

### Adding Alerts

Add `alert` section to panel:

```json
{
  "alert": {
    "conditions": [
      {
        "evaluator": {"params": [100], "type": "gt"},
        "operator": {"type": "and"},
        "query": {"params": ["A", "5m", "now"]},
        "reducer": {"params": [], "type": "last"},
        "type": "query"
      }
    ],
    "for": "5m",
    "name": "Alert Name"
  }
}
```

## Best Practices

1. **Organize by Service**: Group related metrics together
2. **Use Appropriate Visualizations**: 
   - Time series → Graphs
   - Current values → Stats
   - Distributions → Pie charts, tables
3. **Set Refresh Intervals**: 30s for real-time, 5m for historical
4. **Add Annotations**: Mark deployments, incidents
5. **Use Variables**: For tenant/worksite filtering

## Variables

Add dashboard variables for filtering:

```json
{
  "templating": {
    "list": [
      {
        "name": "tenant",
        "type": "query",
        "query": "label_values(tenant_id)",
        "current": {"value": "All"}
      }
    ]
  }
}
```

Use in queries:
```
rate(frames_processed_total{tenant_id="$tenant"}[5m])
```

