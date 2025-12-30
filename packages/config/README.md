# @nexxau/config

Shared configuration management for Nexxau microservices.

## Usage

```typescript
import { Config, getDatabaseConfig, getServiceConfig } from '@nexxau/config';

// Basic usage
const apiKey = Config.get('API_KEY');
const port = Config.getNumber('PORT', 3000);
const enableCache = Config.getBoolean('ENABLE_CACHE', false);

// Service configuration
const serviceConfig = getServiceConfig('auth-service');

// Database configuration
const dbConfig = getDatabaseConfig();
```

## Environment Variables

All configuration comes from environment variables. Services should define required variables in their `.env.example` files.

### Common Variables

- `NODE_ENV` - Environment (development, production, test)
- `PORT` - Service port
- `LOG_LEVEL` - Logging level (trace, debug, info, warn, error, fatal)
- `SERVICE_NAME` - Service name
- `SERVICE_VERSION` - Service version

### Database Variables

- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_SSL` - Enable SSL (true/false)
- `DB_MAX_CONNECTIONS` - Max connection pool size

### Redis Variables

- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Redis database number
- `REDIS_TLS` - Enable TLS (true/false)
