# PostgreSQL Schema Documentation - Multi-Tenant PPE Detection System

## ER Diagram Description

```
┌─────────────┐
│   TENANTS   │ (1)
└──────┬──────┘
       │
       │ 1:N
       │
   ┌───┴──────────────────────────────────────────────────────────┐
   │                                                               │
┌──▼────────┐  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│   USERS   │  │  WORKSITES  │  │   CAMERAS    │  │ DETECTIONS │ │
│           │  │             │  │              │  │            │ │
│ tenant_id │  │ tenant_id   │  │ tenant_id    │  │ tenant_id  │ │
│ role      │  │ address     │  │ worksite_id  │  │ camera_id  │ │
│ email     │  │             │  │ stream_url   │  │ type       │ │
└─────┬─────┘  └──────┬──────┘  └──────┬───────┘  └────────────┘ │
      │               │                │                          │
      │               │                │                          │
      │               │                │                          │
      │               │                │ N:1                      │
      │               │                │                          │
      │               │         ┌──────▼──────────┐              │
      │               │         │   VIOLATIONS    │              │
      │               │         │                 │              │
      │               │         │ tenant_id       │              │
      │               │         │ camera_id       │              │
      │               │         │ detection_id    │              │
      │               │         │ severity        │              │
      │               │         │ status          │              │
      │               │         └──────┬──────────┘              │
      │               │                │                          │
      │               │                │ 1:N                      │
      │               │         ┌──────▼──────────┐              │
      │               │         │ACKNOWLEDGEMENTS │              │
      │               │         │                 │              │
      │               │         │ tenant_id       │              │
      │               │         │ violation_id    │              │
      │               │         │ user_id         │              │
      │               │         └─────────────────┘              │
      │                                                          │
      │ 1:N                                                      │
┌─────▼────────────────────────────────────────┐                │
│          AUDIT_LOGS                          │                │
│          (PARTITIONED BY MONTH)              │                │
│                                              │                │
│ tenant_id (nullable)                        │                │
│ user_id (nullable)                          │                │
│ action, entity_type, entity_id              │                │
│ old_values, new_values (JSONB)              │                │
│ created_at (partition key)                  │                │
└──────────────────────────────────────────────┘                │
                                                                 │
                       All tables have tenant_id                │
                       for multi-tenant isolation               │
```

## Entity Relationships

### Core Hierarchy
1. **Tenants** → **Users** (1:N)
   - Each tenant has multiple users
   - Users belong to exactly one tenant

2. **Tenants** → **Worksites** (1:N)
   - Each tenant has multiple worksites
   - Worksites belong to exactly one tenant

3. **Worksites** → **Cameras** (1:N, optional)
   - Cameras can belong to a worksite OR be tenant-level (worksite_id nullable)
   - All cameras belong to a tenant

4. **Cameras** → **Detections** (1:N)
   - Each camera generates many detections (high-write)
   - Detections are time-stamped raw ML results

5. **Detections** → **Violations** (1:N, optional)
   - Violations are processed/derived from detections
   - Multiple violations can come from one detection

6. **Violations** → **Acknowledgements** (1:N)
   - Users acknowledge violations
   - Unique constraint: one acknowledgement per user per violation

7. **Audit Logs** (Independent)
   - Append-only, references multiple entities
   - tenant_id and user_id are nullable (for system-level logs)
   - Partitioned by month for performance

## Index Rationale

### High-Write Tables (Detections, Violations, Acknowledgements, Audit Logs)

#### Detections Table
- **idx_detections_tenant_id**: Tenant isolation - all queries filtered by tenant
- **idx_detections_camera_id**: Most queries filter by specific camera
- **idx_detections_detected_at**: Time-based queries (recent detections, time ranges)
- **idx_detections_tenant_detected_at**: Composite for tenant + time queries (most common pattern)
- **idx_detections_type**: Filter by detection type (partial index for common violation types)
- **idx_detections_camera_detected_at**: Camera-specific time-range queries

**Rationale**: Detections are inserted at high frequency (potentially hundreds per second per camera). Indexes support:
- Real-time dashboards (recent detections by tenant)
- Historical analysis (time-range queries)
- Camera-specific monitoring
- Alert queries (filtering by violation types)

#### Violations Table
- **idx_violations_tenant_id**: Tenant isolation
- **idx_violations_occurred_at**: Time-based queries
- **idx_violations_tenant_occurred_at**: Most common query pattern (tenant + time)
- **idx_violations_status**: Filter by status (open, acknowledged, resolved)
- **idx_violations_tenant_status**: Tenant + status queries (dashboard filters)
- **idx_violations_severity**: Critical/high severity alerts (partial index)
- **idx_violations_tenant_severity**: Tenant-specific critical violations
- **idx_violations_tenant_status_occurred_at**: Composite for sorted status queries
- **idx_violations_camera_status**: Camera-specific open violations

**Rationale**: Violations are written at moderate frequency but queried heavily:
- Dashboard queries (open violations, recent violations)
- Alert notifications (critical violations)
- Reporting (status filters, time ranges)
- Real-time monitoring (camera-specific open violations)

#### Acknowledgements Table
- **idx_acknowledgements_violation_id**: Lookup acknowledgements for a violation
- **idx_acknowledgements_user_id**: User's acknowledgement history
- **idx_acknowledgements_tenant_id**: Tenant isolation
- **idx_acknowledgements_acknowledged_at**: Time-based queries

**Rationale**: Written when users acknowledge violations. Indexes support:
- Checking if violation is acknowledged
- User acknowledgement history
- Tenant-wide acknowledgement tracking

#### Audit Logs Table (Partitioned)
- **idx_audit_logs_tenant_id**: Tenant-specific audit queries
- **idx_audit_logs_user_id**: User activity tracking
- **idx_audit_logs_entity**: Entity-specific audit trail (entity_type + entity_id)
- **idx_audit_logs_action**: Filter by action type
- **idx_audit_logs_created_at**: Time-based queries (inherited by partitions)

**Rationale**: Audit logs are append-only, high-volume. Partitioning by month:
- Improves query performance (smaller partitions to scan)
- Enables efficient old data archival
- Reduces index size per partition
- Indexes are inherited by all partitions

### Medium-Write Tables (Users, Worksites, Cameras)

#### Users Table
- **idx_users_tenant_id**: Tenant isolation (most common filter)
- **idx_users_tenant_email**: Unique constraint + lookup
- **idx_users_role**: Role-based queries (partial index for active users)
- **idx_users_tenant_role_active**: Active users by role in tenant

**Rationale**: Users table has low write frequency but frequent reads:
- Authentication (email lookup)
- Authorization checks (role queries)
- User management (tenant-scoped lists)

#### Worksites Table
- **idx_worksites_tenant_id**: Tenant isolation
- **idx_worksites_tenant_active**: Active worksites list (partial index)

**Rationale**: Low write frequency, frequent reads for:
- Worksite selection dropdowns
- Camera assignment
- Reporting aggregations

#### Cameras Table
- **idx_cameras_tenant_id**: Tenant isolation
- **idx_cameras_worksite_id**: Worksite-scoped camera queries
- **idx_cameras_tenant_worksite**: Tenant + worksite composite
- **idx_cameras_tenant_active**: Active cameras list (partial index)
- **idx_cameras_worksite_active**: Active cameras by worksite

**Rationale**: Moderate write frequency, frequent reads for:
- Camera management (tenant/worksite scoped)
- Stream selection (active cameras)
- Violation association

## Multi-Tenant Isolation Strategy

### Application-Level Isolation
1. **Always filter by tenant_id**: All queries must include tenant_id in WHERE clause
2. **Tenant context middleware**: Extract tenant_id from JWT/auth token, set in query context
3. **Foreign key constraints**: Ensure cascading deletes maintain isolation
4. **Unique constraints**: Enforce uniqueness per tenant (e.g., email per tenant)

### Database-Level Isolation (Optional)
- **Row Level Security (RLS)**: Available but commented out in migration
- **Function-based validation**: `validate_tenant_access()` function provided
- **Triggers**: Can enforce tenant isolation at database level (not implemented)

### Best Practices
1. Never expose tenant_id in APIs (derive from authenticated user)
2. Validate tenant access before queries (use `validate_tenant_access()`)
3. Use parameterized queries to prevent SQL injection
4. Log all tenant access in audit_logs

## Partitioning Strategy (Audit Logs)

### Monthly Partitioning
- **Partition key**: `created_at` (TIMESTAMP WITH TIME ZONE)
- **Partition type**: RANGE partitioning
- **Naming**: `audit_logs_YYYY_MM` (e.g., `audit_logs_2024_01`)

### Benefits
1. **Query performance**: Smaller partitions = faster scans
2. **Maintenance**: Easy to drop old partitions (data retention)
3. **Index efficiency**: Indexes per partition are smaller
4. **Parallel queries**: PostgreSQL can query partitions in parallel

### Maintenance
- **Automatic creation**: Run `maintain_audit_log_partitions()` monthly (via cron)
- **Archival**: Drop partitions older than retention period
- **Monitoring**: Track partition sizes and query performance

## Data Retention Recommendations

### Audit Logs
- **Retention**: 1-2 years (configurable per tenant)
- **Archival**: Move old partitions to cold storage or drop
- **Query pattern**: Most queries target recent data (last 30-90 days)

### Detections
- **Retention**: 30-90 days (raw detections)
- **Aggregation**: Aggregate older data into summaries
- **Archive**: Move old detections to separate archive table or data warehouse

### Violations
- **Retention**: Indefinite (business records)
- **Status-based**: Resolved violations can be archived separately

## Performance Considerations

### Write Performance
- **Batch inserts**: Use batch inserts for detections (100-1000 rows at a time)
- **Connection pooling**: Use connection pooler (PgBouncer) for high concurrency
- **Async writes**: Consider async writes for audit logs in high-traffic scenarios

### Read Performance
- **Read replicas**: Use read replicas for reporting/analytics
- **Materialized views**: Create materialized views for common aggregations
- **Query optimization**: Use EXPLAIN ANALYZE for slow queries
- **Vacuum**: Regular VACUUM for high-write tables

### Index Maintenance
- **REINDEX**: Periodically reindex high-write tables
- **ANALYZE**: Update statistics regularly for query planner
- **Monitor**: Track index usage with pg_stat_user_indexes

## Security Considerations

### Tenant Isolation
- Application-level filtering (required)
- Database-level RLS (optional, commented out)
- Function-based validation (`validate_tenant_access()`)

### Data Protection
- **Encryption at rest**: Enable TDE or filesystem encryption
- **Encryption in transit**: Use SSL/TLS for connections
- **Password hashing**: Store password hashes (not plaintext)
- **PII handling**: Consider encryption for sensitive user data

### Audit Trail
- All changes logged in audit_logs (append-only)
- Include user_id, ip_address, user_agent
- Track both old and new values for updates
- Immutable audit logs (no updates/deletes)

## Migration Order

1. **001_initial_schema.sql**: Core tables, indexes, functions
2. **002_audit_logs_partitioned.sql**: Partitioned audit logs table
3. **003_indexes_optimization.sql**: Additional performance indexes

Run migrations in order. Can be rolled back individually if needed.
