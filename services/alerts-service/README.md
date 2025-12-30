# Alerts Service

Service for sending alerts and managing acknowledgements for violation state changes.

## Overview

The Alerts Service:
- Listens to `violations:state_changes` Redis stream
- Sends alerts only on ACTIVE and ESCALATED states
- Supports multiple alert channels (WebSocket, Email, SMS)
- Respects suppression window to avoid alert flooding
- Handles escalation with higher-severity alerts
- Manages acknowledgements (ACKs suppress further alerts)
- Requires snapshot URLs before sending (configurable)
- Implements retry policy for failed alerts

## Alert Rules

1. **State Filtering**: Only alerts on ACTIVE and ESCALATED states
2. **Suppression Window**: 60 seconds default (configurable)
3. **Escalation**: ESCALATED state triggers HIGH severity alerts
4. **Acknowledgement**: ACKed violations suppress all further alerts

## Alert Channels

### WebSocket

- Publishes alerts to Redis Pub/Sub channel: `alerts:websocket:tenant:{tenant_id}`
- Real-time delivery to connected clients
- No explicit recipients needed (broadcasts to tenant)

### Email (Gmail SMTP)

- Sends HTML and plain text emails
- Includes violation details and snapshot/clip URLs
- Requires SMTP credentials (Gmail app password)

### SMS (Twilio)

- Sends concise SMS alerts
- Includes violation type, ID, state, and snapshot URL
- Requires Twilio account credentials

## Configuration

### Environment Variables

```bash
# Alert Configuration
ALERT_SUPPRESSION_WINDOW_SECONDS=60
REQUIRE_SNAPSHOTS=true
ALERT_RETRY_MAX_ATTEMPTS=3
ALERT_RETRY_BACKOFF_SECONDS=1.0

# Channel Configuration
ENABLE_WEBSOCKET=true
ENABLE_EMAIL=true
ENABLE_SMS=false

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# S3 Configuration (for signed URLs)
S3_ENDPOINT_URL=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1
SIGNED_URL_TTL_SECONDS=3600

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexxau
DB_USER=postgres
DB_PASSWORD=
```

## Architecture

### Data Flow

```
Violation Engine → violations:state_changes (Redis Stream)
                          ↓
Alerts Service → Check state (ACTIVE/ESCALATED)
                          ↓
                    Check suppression window
                          ↓
                    Check acknowledgements
                          ↓
                    Fetch snapshot URLs
                          ↓
                    Route to channels (WebSocket/Email/SMS)
                          ↓
                    Retry on failure
```

### Suppression Logic

1. **Time-based suppression**: Alerts suppressed if sent within suppression window (default: 60s)
2. **Acknowledgement suppression**: Alerts suppressed if violation is acknowledged
3. **State-based filtering**: Only ACTIVE and ESCALATED states trigger alerts

### Retry Policy

- **Max attempts**: 3 (configurable)
- **Backoff**: Exponential (1s, 2s, 3s)
- **Retry on**: Channel send failures
- **No retry on**: Suppression, acknowledgement, missing snapshots

## Acknowledgement API

### Create Acknowledgement

```python
from alerts_service.acknowledgement_repository import AcknowledgementRepository

repo = AcknowledgementRepository(db_pool)
ack_id = repo.create_acknowledgement(
    tenant_id="tenant-123",
    violation_id="violation-456",
    user_id="user-789",
    note="Acknowledged and handled"
)
```

### Check Acknowledgement

```python
has_ack = repo.has_acknowledgement("violation-456")
if has_ack:
    # Suppress alerts
    pass
```

## Metrics

Prometheus metrics exposed on port 8000:

- `alerts_sent_total{channel,tenant_id,state}`: Total alerts sent per channel
- `alerts_acknowledged_total{tenant_id}`: Total acknowledgements created
- `alerts_escalated_total{tenant_id}`: Total escalated alerts
- `alert_send_latency_ms`: Alert send latency histogram

## Database Schema

Uses existing `acknowledgements` table from `001_initial_schema.sql`:

```sql
CREATE TABLE acknowledgements (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    violation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (user_id, violation_id)
);
```

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export REDIS_HOST=localhost
export DB_PASSWORD=your-password
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password

# Run service
python src/main.py
```

## Testing

```bash
# Run tests
pytest tests/

# Test specific modules
pytest tests/test_alert_channels.py -v
pytest tests/test_alert_router.py -v
pytest tests/test_acknowledgement_repository.py -v
```

## Dependencies

- **redis**: Redis client for streams and Pub/Sub
- **psycopg2**: PostgreSQL adapter
- **boto3**: AWS SDK for S3 signed URLs
- **twilio**: Twilio SDK for SMS (optional)
- **prometheus-client**: Metrics collection

## Limitations

- In-memory suppression tracking (use Redis for distributed systems)
- Recipients hardcoded to empty (should fetch from database)
- No dead-letter queue for poison messages
- WebSocket requires separate WebSocket server for client connections

## Future Enhancements

- Database-backed recipient configuration per tenant/worksite
- Redis-based suppression tracking for distributed systems
- Dead-letter queue for failed alerts
- Alert templates with custom formatting
- Rate limiting per channel
- Alert delivery receipts

