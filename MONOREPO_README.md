# Nexxau Monorepo - Production-Grade Multi-Tenant PPE Detection Platform

## 📁 Folder Structure

```
nexxau/
├── services/                    # Microservices
│   ├── api-gateway/            # API Gateway (Node.js)
│   ├── auth-service/           # Authentication & Authorization (Node.js)
│   ├── detection-service/      # ML Detection Worker (Python)
│   ├── camera-service/         # Camera Management (Node.js)
│   ├── notification-service/   # Alerts & Notifications (Node.js)
│   ├── _template-nodejs/       # Node.js service template
│   └── _template-python/       # Python service template
│
├── packages/                    # Shared packages
│   ├── shared-types/           # TypeScript & Python types
│   ├── logger/                 # JSON logger (Node.js)
│   ├── errors/                 # Error handling (Node.js)
│   └── config/                 # Configuration management (Node.js)
│
├── infrastructure/             # Infrastructure as code
│   ├── docker/                 # Docker templates
│   ├── k8s/                    # Kubernetes manifests
│   └── scripts/                # Deployment scripts
│
└── docker-compose.yml          # Local development orchestration
```

---

## 🏗️ Service Naming Conventions

### Service Names
- Use kebab-case: `auth-service`, `detection-service`
- Be descriptive: clearly indicate the service's responsibility
- Suffix with `-service` for backend services, `-gateway` for gateways, `-worker` for background workers (optional)

### Package Names
- Node.js packages: `@nexxau/{service-name}`
- Python packages: `nexxau-{service-name}` (hyphens, not underscores)

### Environment Variables
- Use SCREAMING_SNAKE_CASE: `SERVICE_NAME`, `DB_HOST`, `REDIS_PORT`
- Prefix service-specific vars with service name: `AUTH_SERVICE_SECRET_KEY`
- Use common prefixes for shared resources: `DB_*`, `REDIS_*`, `S3_*`

### Database Schemas
- Use snake_case for tables: `users`, `detection_results`, `camera_streams`
- Prefix with tenant_id for multi-tenant tables when needed
- Use singular nouns for table names: `user` not `users` (but we use plural for consistency)

### API Endpoints
- Use RESTful conventions: `/api/v1/{resource}/{id}`
- Use kebab-case for paths: `/api/v1/camera-streams`
- Version all APIs: `/api/v1/`, `/api/v2/`

---

## 📦 Shared Packages

### @nexxau/logger

Structured JSON logging for all services.

**Usage:**
```typescript
import { createLogger } from '@nexxau/logger';

const logger = createLogger({
  service: 'auth-service',
  environment: process.env.NODE_ENV,
  version: '1.0.0',
});

logger.info('User authenticated', {
  tenantId: 'company-123',
  userId: 'user-456',
  requestId: 'req-789',
});
```

**Output Format:**
```json
{
  "level": "INFO",
  "service": "auth-service",
  "environment": "production",
  "version": "1.0.0",
  "msg": "User authenticated",
  "tenantId": "company-123",
  "userId": "user-456",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### @nexxau/errors

Standardized error handling across services.

**Usage:**
```typescript
import { NotFoundError, ValidationError, ErrorHandler } from '@nexxau/errors';

// Throw errors
if (!user) {
  throw new NotFoundError('User', userId);
}

// Handle in API routes
try {
  // ... logic
} catch (error) {
  return res.status(error.statusCode).json(ErrorHandler.toResponse(error));
}
```

**Error Classes:**
- `ValidationError` (400) - Input validation failures
- `AuthenticationError` (401) - Authentication required
- `AuthorizationError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `RateLimitError` (429) - Rate limit exceeded
- `InternalServerError` (500) - Internal errors
- `ServiceUnavailableError` (503) - External service unavailable

### @nexxau/config

Configuration management from environment variables.

**Usage:**
```typescript
import { Config, getDatabaseConfig, getServiceConfig } from '@nexxau/config';

const apiKey = Config.get('API_KEY');
const port = Config.getNumber('PORT', 3000);
const serviceConfig = getServiceConfig('auth-service');
const dbConfig = getDatabaseConfig();
```

### @nexxau/shared-types

Shared TypeScript and Python types for inter-service communication.

**TypeScript:**
```typescript
import { DetectionResult, DetectionType, UserRole } from '@nexxau/shared-types';
```

**Python:**
```python
from nexxau_shared_types import DetectionResult, DetectionType, Detection
```

---

## 🐳 Docker Conventions

### Base Dockerfiles

Templates are located in `infrastructure/docker/`:
- `Dockerfile.nodejs.base` - Base template for Node.js services
- `Dockerfile.python.base` - Base template for Python services

### Service Dockerfiles

Each service should have its own `Dockerfile` based on the templates:
1. Copy the appropriate base template
2. Customize port, health check, and CMD
3. Add service-specific build steps if needed

### Multi-stage Builds

All Dockerfiles use multi-stage builds:
- `base` - Base image with dependencies
- `builder` - Build stage (includes dev dependencies)
- `runtime` - Final image (production dependencies only)

### Security

- All containers run as non-root users
- Use `.dockerignore` to exclude unnecessary files
- Scan images for vulnerabilities before deployment
- Keep base images updated

---

## 🔧 Configuration Management

### Environment Variables

All configuration comes from environment variables. Services should:

1. Define required variables in `.env.example`
2. Use `@nexxau/config` for type-safe access
3. Validate required variables on startup
4. Never commit `.env` files to git

### Common Environment Variables

#### Service Configuration
```bash
NODE_ENV=production|development|test
PORT=3000
SERVICE_NAME=auth-service
SERVICE_VERSION=1.0.0
LOG_LEVEL=info|debug|warn|error
```

#### Database
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexxau
DB_USER=postgres
DB_PASSWORD=secret
DB_SSL=false
DB_MAX_CONNECTIONS=10
```

#### Redis
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false
```

#### Multi-tenancy
```bash
TENANT_ID=company-123  # For single-tenant deployments
```

---

## 📝 Logging Conventions

### Log Levels

- `FATAL` - Service must exit (unrecoverable)
- `ERROR` - Error occurred but service continues
- `WARN` - Warning (potential issue)
- `INFO` - Informational (normal operations)
- `DEBUG` - Debug information (development only)
- `TRACE` - Very detailed tracing (development only)

### Log Context

Always include relevant context:
```typescript
logger.info('Processing detection', {
  tenantId: 'company-123',
  cameraId: 'cam-456',
  requestId: 'req-789',
  detectionCount: 5,
});
```

### Structured Logging

All logs are JSON-formatted for log aggregation systems:
- Use consistent field names
- Include tenant/user IDs for multi-tenant tracking
- Include request/correlation IDs for tracing
- Never log sensitive data (passwords, tokens, PII)

---

## ⚠️ Error Handling Conventions

### Error Types

1. **Operational Errors** - Expected errors (use AppError subclasses)
   - Validation errors
   - Authentication/authorization failures
   - Resource not found
   - Business logic violations

2. **Programming Errors** - Unexpected errors (use InternalServerError)
   - Null reference errors
   - Type errors
   - Logic bugs

### Error Response Format

All errors follow this format:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with identifier 'user-123' not found",
    "statusCode": 404,
    "context": {
      "resource": "User",
      "identifier": "user-123"
    }
  }
}
```

### Error Handling Best Practices

1. Use specific error classes (NotFoundError, ValidationError, etc.)
2. Include context in errors
3. Log errors before returning responses
4. Never expose internal errors in production
5. Use error codes for client-side handling

---

## 🚀 Service Template Usage

### Creating a New Node.js Service

1. Copy `services/_template-nodejs` to `services/{your-service-name}`
2. Update `package.json`:
   - Change `name` to `@nexxau/{your-service-name}`
   - Update description
3. Update `src/index.ts`:
   - Replace `SERVICE_NAME` with your service name
   - Add your routes and logic
4. Create `.env.example` with required variables
5. Customize `Dockerfile` if needed

### Creating a New Python Service

1. Copy `services/_template-python` to `services/{your-service-name}`
2. Update `requirements.txt` with dependencies
3. Update `main.py`:
   - Replace `SERVICE_NAME` with your service name
   - Add your application logic
4. Create `.env.example` with required variables
5. Customize `Dockerfile` if needed

---

## 🗄️ Database Conventions

### Multi-tenancy

- All tenant-scoped tables should include `tenant_id` column
- Use row-level security (RLS) when possible
- Always filter queries by `tenant_id`
- Never expose data across tenants

### Migrations

- Use database migration tools (Prisma, Alembic, etc.)
- Version all migrations
- Test migrations on staging before production
- Never modify existing migrations (create new ones)

### Connection Pooling

- Use connection pools (default: 10 connections)
- Configure based on service load
- Monitor pool usage

---

## 🔐 Security Conventions

### Authentication & Authorization

- Use JWT tokens for service-to-service auth
- Include `tenant_id` and `user_id` in tokens
- Validate tokens on every request
- Use role-based access control (RBAC)

### Secrets Management

- Never commit secrets to git
- Use environment variables or secret managers (AWS Secrets Manager, Vault)
- Rotate secrets regularly
- Use different secrets for each environment

### API Security

- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Sanitize outputs
- Use CORS appropriately

---

## 📊 Monitoring & Observability

### Health Checks

All services must implement `/health` endpoint:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Metrics

- Track request counts, latency, error rates
- Use Prometheus-compatible metrics
- Expose metrics on `/metrics` endpoint

### Tracing

- Include `request-id` and `correlation-id` in logs
- Pass request context between services
- Use distributed tracing (OpenTelemetry, Jaeger)

---

## 🧪 Testing Conventions

### Unit Tests

- Test business logic in isolation
- Mock external dependencies
- Aim for >80% code coverage

### Integration Tests

- Test service endpoints
- Use test databases
- Clean up after tests

### E2E Tests

- Test complete workflows
- Use test tenants
- Run in CI/CD pipeline

---

## 🚢 Deployment Conventions

### Container Images

- Tag images with version or commit SHA
- Use semantic versioning: `v1.2.3`
- Never use `latest` tag in production

### Environment Promotion

- Development → Staging → Production
- Test in staging before production
- Use blue-green or canary deployments

### Rollback Plan

- Keep previous versions available
- Document rollback procedures
- Test rollback process

---

## 📚 Development Workflow

### Monorepo Setup

1. Install dependencies at root: `npm install`
2. Build shared packages: `npm run build` (in each package)
3. Start services individually or use docker-compose

### Local Development

```bash
# Start all services with docker-compose
docker-compose up

# Or start individual service
cd services/auth-service
npm install
npm run dev
```

### Building Services

```bash
# Build a service
cd services/auth-service
npm run build

# Build Docker image
docker build -t auth-service .
```

---

## 🔄 Future Considerations

This foundation sets up:

- ✅ Monorepo structure
- ✅ Shared logging (JSON format)
- ✅ Shared error handling
- ✅ Configuration management
- ✅ Shared types (TypeScript & Python)
- ✅ Docker templates
- ✅ Service templates
- ✅ Naming conventions

**Next Steps (not implemented yet):**
- CI/CD pipeline configuration
- Kubernetes manifests for production
- API Gateway routing configuration
- Service discovery setup
- Distributed tracing integration
- Monitoring & alerting setup
- Multi-tenant database schema
- Business logic implementation

---

## 📖 Additional Resources

- [Service Templates](./services/_template-nodejs/README.md)
- [Docker Templates](./infrastructure/docker/)
- [Shared Packages](./packages/)
- [Kubernetes Config](./infrastructure/k8s/)

---

## 🤝 Contributing

When adding new services or packages:

1. Follow naming conventions
2. Use shared packages (logger, errors, config, types)
3. Include health check endpoint
4. Add proper error handling
5. Update this README if conventions change
6. Add service-specific README
