# Alert Orchestrator Service

Service for orchestrating alert delivery with rate limiting, escalation, and retry logic.

## Overview

The Alert Orchestrator Service:
- Listens to `violations:state_changes` Redis stream
- Sends alerts via multiple channels (Socket.IO, Email, SMS)
- Implements rate limiting per camera and per user
- Handles severity-based escalation
- Retries failed deliveries with exponential backoff
- Logs all failures for monitoring

## Features

### Alert Channels

- **Socket.IO**: Real-time alerts via Redis Pub/Sub
- **Email (SMTP/Gmail)**: HTML and plain text emails
- **SMS (Twilio)**: Concise SMS alerts

### Rate Limiting

- **Per-Camera**: Default 5 alerts per minute
- **Per-User**: Default 10 alerts per minute
- **Sliding Window**: 60-second window
- See [RATE_LIMIT_RULES.md](./RATE_LIMIT_RULES.md) for details

### Severity-Based Escalation

- **MEDIUM**: ACTIVE state (Socket.IO, Email)
- **HIGH**: ESCALATED state (adds SMS)
- **CRITICAL**: Persistent violation > 15 minutes (all channels)
- See escalation logic in `escalation_manager.py`

### Retry Logic

- **Max Attempts**: 3 (configurable)
- **Exponential Backoff**: 1s, 2s, 4s (with jitter)
- **Per-Channel**: Each channel retried independently
- See [RETRY_LOGIC.md](./RETRY_LOGIC.md) for details

### Failure Logging

- Structured logging for all failures
- Metrics tracking retry attempts
- Context-rich error messages

## Alert Flow

See [ALERT_FLOW_DIAGRAM.md](./ALERT_FLOW_DIAGRAM.md) for detailed flow diagram.

**Summary**:
1. Consume violation state changes from Redis
2. Check rate limits (camera and user)
3. Determine severity with escalation rules
4. Select channels based on severity
5. Send to each channel with retry logic
6. Log results and update metrics

## Configuration

### Environment Variables

```bash
# Rate Limiting
RATE_LIMIT_CAMERA_PER_MINUTE=5
RATE_LIMIT_USER_PER_MINUTE=10

# Escalation
ESCALATION_CRITICAL_THRESHOLD_MINUTES=15

# Retry
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_BACKOFF_SECONDS=1.0
RETRY_MAX_BACKOFF_SECONDS=60.0
RETRY_BACKOFF_MULTIPLIER=2.0

# Channels
ENABLE_SOCKETIO=true
ENABLE_EMAIL=true
ENABLE_SMS=false

# Email (SMTP/Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export REDIS_HOST=localhost
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password

# Run service
python src/main.py
```

## Metrics

Prometheus metrics exposed on port 8000:

- `alerts_orchestrated_total{severity, tenant_id, success}`: Total alerts orchestrated
- `alerts_rate_limited_total{reason, tenant_id}`: Rate-limited alerts
- `alert_orchestration_latency_ms`: Orchestration latency histogram
- `alert_retry_attempts_total{channel, tenant_id}`: Retry attempts

## Architecture

### Components

- **ViolationStateChangeConsumer**: Consumes from Redis stream
- **AlertOrchestrator**: Main orchestration logic
- **RateLimiter**: Rate limiting per camera/user
- **EscalationManager**: Severity determination and escalation
- **RetryHandler**: Retry logic with exponential backoff
- **FailureLogger**: Failure logging and monitoring
- **Alert Channels**: Socket.IO, Email, SMS implementations

### Dependencies

- **redis**: Redis client for streams and Pub/Sub
- **prometheus-client**: Metrics collection
- **twilio**: Twilio SDK for SMS (optional)

## Documentation

- [ALERT_FLOW_DIAGRAM.md](./ALERT_FLOW_DIAGRAM.md): Detailed alert flow diagram
- [RATE_LIMIT_RULES.md](./RATE_LIMIT_RULES.md): Rate limiting rules and configuration
- [RETRY_LOGIC.md](./RETRY_LOGIC.md): Retry logic with exponential backoff

## Testing

```bash
# Run tests
pytest tests/

# Test specific components
pytest tests/test_rate_limiter.py -v
pytest tests/test_escalation_manager.py -v
pytest tests/test_retry_handler.py -v
```

## Limitations

- In-memory rate limiting (use Redis for distributed systems)
- No circuit breaker (can be added)
- No dead-letter queue for persistent failures
- Socket.IO requires separate Socket.IO server

## Future Enhancements

- Redis-based rate limiting for distributed systems
- Circuit breaker pattern for failing channels
- Dead-letter queue for persistent failures
- Alert delivery receipts
- Custom retry policies per channel
- Recipient lookup from database

