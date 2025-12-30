# Acknowledgement Service

Service for handling violation acknowledgements via web, email link, and SMS.

## Overview

The Acknowledgement Service:
- Provides HTTP API for acknowledgements
- Supports web, email link, and SMS acknowledgement methods
- Tracks acknowledgement time, user, and method
- Manages state transitions (violation remains OPEN if condition persists)
- Implements escalation rules (timeout-based escalation)

## Features

### Acknowledgement Methods

1. **Web**: `POST /acknowledge`
   - Direct API call from web interface
   - Requires violation_id, tenant_id, user_id
   - Optional note field

2. **Email Link**: `GET /acknowledge/email?token=...`
   - Secure token-based acknowledgement
   - Token contains violation_id, tenant_id, user_id
   - Returns HTML confirmation page

3. **SMS**: `POST /acknowledge/sms`
   - Twilio webhook endpoint
   - Parses user phone from SMS
   - Returns Twilio XML response

### State Management

- **Acknowledgement doesn't auto-resolve**: Violation remains OPEN (ACTIVE/ESCALATED) if condition persists
- **State transitions**: Based on condition persistence, not acknowledgement status
- **Escalation**: Timeout-based escalation if not acknowledged in time

### Tracking

- **Time**: `acknowledged_at` timestamp
- **User**: `user_id` who acknowledged
- **Method**: Stored in `note` field (web, email_link, sms)

## API Endpoints

### POST /acknowledge

Acknowledge violation via web interface.

**Request**:
```json
{
  "violation_id": "550e8400-...",
  "tenant_id": "660e8400-...",
  "user_id": "770e8400-...",
  "note": "Acknowledged and handling"
}
```

**Response**:
```json
{
  "success": true,
  "acknowledgement_id": "880e8400-...",
  "violation_id": "550e8400-...",
  "method": "web",
  "acknowledged_at": "2024-01-15T10:30:00Z"
}
```

### GET /acknowledge/email?token=...

Acknowledge violation via email link.

**Query Parameters**:
- `token`: Secure token from email link
- `note`: Optional acknowledgement note

**Response**: HTML confirmation page

### POST /acknowledge/sms

Acknowledge violation via SMS (Twilio webhook).

**Request** (Twilio format):
```json
{
  "violation_id": "550e8400-...",
  "tenant_id": "660e8400-...",
  "From": "+1234567890",
  "Body": "ACK"
}
```

**Response**: Twilio XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Acknowledgement received. Thank you.</Message>
</Response>
```

## Configuration

### Environment Variables

```bash
# Service Configuration
PORT=8080

# Security
ACK_TOKEN_SECRET=change-me-in-production

# Timeout Configuration
ACK_TIMEOUT_MINUTES=30
ESCALATION_TIMEOUT_MINUTES=60

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexxau
DB_USER=postgres
DB_PASSWORD=
```

## State Transitions

See [STATE_TRANSITIONS.md](./STATE_TRANSITIONS.md) for detailed state transition documentation.

**Key Rules**:
- Acknowledgement doesn't auto-resolve violations
- Violation remains ACTIVE/ESCALATED if condition persists
- Escalation occurs if not acknowledged within timeout

## Escalation Rules

See [ESCALATION_RULES.md](./ESCALATION_RULES.md) for detailed escalation rules.

**Key Rules**:
- Unacknowledged violations escalate after 30 minutes (default)
- Acknowledged but unresolved violations escalate after 60 minutes (default)

## Database Schema

See [DB_SCHEMA_USAGE.md](./DB_SCHEMA_USAGE.md) for detailed schema usage documentation.

**Table**: `acknowledgements` (from `001_initial_schema.sql`)

**Fields**:
- `id`: UUID primary key
- `tenant_id`: Tenant identifier
- `violation_id`: Violation identifier
- `user_id`: User identifier
- `acknowledged_at`: Timestamp when acknowledged
- `note`: Note (includes method prefix: `[web]`, `[email_link]`, `[sms]`)
- `created_at`: Record creation timestamp

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DB_PASSWORD=your-password
export ACK_TOKEN_SECRET=your-secret-key

# Run service
python src/main.py
```

## Metrics

Prometheus metrics exposed on `/metrics`:

- `acknowledgements_created_total{method, tenant_id}`: Total acknowledgements created
- `acknowledgement_processing_latency_ms`: Processing latency histogram

## Security

### Token Generation

Email link tokens are generated using HMAC-SHA256:

```python
token = base64_urlsafe(
    f"{violation_id}:{tenant_id}:{user_id}:{hmac_signature}"
)
```

Tokens include:
- Violation ID
- Tenant ID
- User ID
- HMAC signature for verification

### Token Validation

- Tokens are validated on each request
- Invalid tokens are rejected
- Tokens don't expire (consider adding expiration for production)

## Testing

```bash
# Run tests
pytest tests/

# Test specific endpoints
curl -X POST http://localhost:8080/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "violation_id": "...",
    "tenant_id": "...",
    "user_id": "..."
  }'
```

## Documentation

- [STATE_TRANSITIONS.md](./STATE_TRANSITIONS.md): State transition rules and diagrams
- [ESCALATION_RULES.md](./ESCALATION_RULES.md): Escalation rules and configuration
- [DB_SCHEMA_USAGE.md](./DB_SCHEMA_USAGE.md): Database schema usage and queries

## Limitations

- Method tracking stored in `note` field (consider dedicated column)
- Tokens don't expire (add expiration for production)
- User phone mapping placeholder (implement database lookup)
- No webhook validation for SMS (add Twilio signature validation)

## Future Enhancements

- Dedicated `method` column in database schema
- Token expiration and refresh
- Database-backed user phone mapping
- Twilio webhook signature validation
- Acknowledgement notifications
- Acknowledgement analytics and reporting

