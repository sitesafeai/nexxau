# @nexxau/logger

Shared JSON logger for Nexxau microservices.

## Usage

```typescript
import { createLogger } from '@nexxau/logger';

const logger = createLogger({
  service: 'auth-service',
  environment: process.env.NODE_ENV,
  version: '1.0.0',
});

// Basic logging
logger.info('Service started', { port: 3000 });
logger.error('Failed to connect', { host: 'localhost' }, error);

// With context (tenant/user tracking)
logger.info('User logged in', {
  tenantId: 'company-123',
  userId: 'user-456',
  requestId: 'req-789',
});
```

## Output Format

All logs are structured JSON:
```json
{
  "level": "INFO",
  "service": "auth-service",
  "environment": "production",
  "version": "1.0.0",
  "msg": "User logged in",
  "tenantId": "company-123",
  "userId": "user-456",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
