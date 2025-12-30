# Database Schema - Multi-Tenant PPE Detection System

## Overview

PostgreSQL schema designed for a production-grade, multi-tenant PPE detection platform with:
- Complete tenant isolation
- High-write tables optimized for detection/violation data
- Monthly partitioned audit logs
- Comprehensive indexing strategy

## Quick Start

### Apply Migrations

```bash
# Connect to PostgreSQL
psql -U postgres -d nexxau

# Run migrations in order
\i migrations/001_initial_schema.sql
\i migrations/002_audit_logs_partitioned.sql
\i migrations/003_indexes_optimization.sql
```

### Or use a migration tool

```bash
# Using a migration tool like node-pg-migrate, flyway, or alembic
# Follow the tool's instructions to apply migrations
```

## Schema Files

- **001_initial_schema.sql**: Core tables (tenants, users, worksites, cameras, detections, violations, acknowledgements)
- **002_audit_logs_partitioned.sql**: Append-only audit logs with monthly partitioning
- **003_indexes_optimization.sql**: Additional performance indexes

## Documentation

See [SCHEMA_DOCUMENTATION.md](./SCHEMA_DOCUMENTATION.md) for:
- ER diagram description
- Index rationale
- Multi-tenant isolation strategy
- Performance considerations
- Security best practices

## Maintenance

### Monthly: Create Next Audit Log Partition

```sql
SELECT maintain_audit_log_partitions();
```

Set up a cron job or scheduler to run this monthly.

### Periodically: Update Statistics

```sql
ANALYZE detections;
ANALYZE violations;
ANALYZE acknowledgements;
ANALYZE audit_logs;
```

### Monitor: Index Usage

```sql
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
ORDER BY idx_scan DESC;
```
