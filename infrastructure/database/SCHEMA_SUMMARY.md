# PostgreSQL Schema Summary

## Tables Overview

| Table | Purpose | Write Frequency | Key Indexes |
|-------|---------|----------------|-------------|
| `tenants` | Multi-tenant root | Low | `slug` (unique) |
| `users` | User accounts per tenant | Low | `tenant_id`, `(tenant_id, email)` |
| `worksites` | Physical locations | Low | `tenant_id` |
| `cameras` | Camera devices | Medium | `tenant_id`, `worksite_id`, `is_active` |
| `detections` | Raw ML detection results | **HIGH** | `tenant_id`, `camera_id`, `detected_at` |
| `violations` | Processed violations | **HIGH** | `tenant_id`, `status`, `severity`, `occurred_at` |
| `acknowledgements` | User acknowledgements | **HIGH** | `violation_id`, `user_id` |
| `audit_logs` | Append-only audit trail | **HIGH** | `tenant_id`, `user_id`, `entity`, `created_at` (partitioned) |

## Multi-Tenant Isolation

**All tenant-scoped tables include `tenant_id`:**
- `users` → `tenant_id`
- `worksites` → `tenant_id`
- `cameras` → `tenant_id` (+ optional `worksite_id`)
- `detections` → `tenant_id`
- `violations` → `tenant_id`
- `acknowledgements` → `tenant_id`
- `audit_logs` → `tenant_id` (nullable for system logs)

**Application-level isolation required:**
- Always filter queries by `tenant_id`
- Extract `tenant_id` from authenticated user
- Use `validate_tenant_access()` function for validation

## Key Index Rationale

### High-Write Tables

#### Detections
- **Primary queries**: Recent detections by tenant, camera-specific detections, time-range queries
- **Key indexes**: `(tenant_id, detected_at DESC)`, `(camera_id, detected_at DESC)`
- **Rationale**: Real-time dashboards and historical analysis

#### Violations
- **Primary queries**: Open violations by tenant, critical violations, status filters
- **Key indexes**: `(tenant_id, status, occurred_at DESC)`, `(tenant_id, severity)` where critical
- **Rationale**: Dashboard queries, alert notifications, reporting

#### Acknowledgements
- **Primary queries**: Check if violation acknowledged, user acknowledgement history
- **Key indexes**: `(violation_id)`, `(user_id)`
- **Rationale**: UI state (acknowledgement status), user activity tracking

#### Audit Logs (Partitioned)
- **Primary queries**: Audit trail by entity, user activity, tenant activity
- **Key indexes**: `(entity_type, entity_id)`, `(tenant_id, created_at DESC)`
- **Partitioning**: Monthly partitions for performance and archival

## Partitioning Strategy

**audit_logs table:**
- Partitioned by `created_at` (monthly)
- Partition naming: `audit_logs_YYYY_MM`
- Function: `maintain_audit_log_partitions()` (run monthly)
- Benefits: Query performance, easy archival, smaller indexes

## Entity Relationships

```
tenants (1) ──┬── (N) users
              ├── (N) worksites
              ├── (N) cameras
              ├── (N) detections
              ├── (N) violations
              ├── (N) acknowledgements
              └── (N) audit_logs

worksites (1) ─── (N) cameras

cameras (1) ─── (N) detections
           └── (N) violations

detections (1) ─── (N) violations

violations (1) ─── (N) acknowledgements

users (1) ─── (N) acknowledgements
       └── (N) audit_logs (via user_id)
```

## User Roles

Enum: `user_role`
- `admin` - Full access to tenant
- `safety_manager` - Manage violations, cameras, worksites
- `viewer` - Read-only access

## Violation Statuses

Enum: `violation_status`
- `open` - New violation, not acknowledged
- `acknowledged` - User has acknowledged
- `resolved` - Violation resolved/fixed
- `false_positive` - Marked as false positive

## Violation Severities

Enum: `violation_severity`
- `low` - Minor issue
- `medium` - Standard violation
- `high` - Serious violation
- `critical` - Immediate action required

## Data Types

- **IDs**: UUID (primary keys)
- **Timestamps**: TIMESTAMP WITH TIME ZONE
- **Metadata**: JSONB (flexible schema)
- **Bounding boxes**: JSONB `{"x": 100, "y": 200, "width": 50, "height": 80}`
- **Confidence**: DECIMAL(5,4) (0.0000 to 1.0000)

## Constraints

### Unique Constraints
- `tenants.slug` - Unique across all tenants
- `users(tenant_id, email)` - Email unique per tenant
- `acknowledgements(user_id, violation_id)` - One acknowledgement per user per violation

### Foreign Key Constraints
- All `tenant_id` columns reference `tenants.id` ON DELETE CASCADE
- `users.tenant_id` → `tenants.id`
- `worksites.tenant_id` → `tenants.id`
- `cameras.tenant_id` → `tenants.id`
- `cameras.worksite_id` → `worksites.id` ON DELETE SET NULL
- `detections.camera_id` → `cameras.id` ON DELETE CASCADE
- `violations.camera_id` → `cameras.id`
- `violations.detection_id` → `detections.id` ON DELETE SET NULL
- `acknowledgements.violation_id` → `violations.id`
- `acknowledgements.user_id` → `users.id`

## Maintenance

### Monthly Tasks
1. Create next month's audit log partition: `SELECT maintain_audit_log_partitions();`

### Periodic Tasks
1. Update statistics: `ANALYZE` on high-write tables
2. Monitor index usage: `pg_stat_user_indexes`
3. Reindex if needed: `REINDEX TABLE` for high-write tables

### Data Retention
- **Audit logs**: 1-2 years (drop old partitions)
- **Detections**: 30-90 days (aggregate older data)
- **Violations**: Indefinite (business records)

## Security

1. **Tenant isolation**: Application-level filtering required
2. **Row Level Security**: Available but commented out (optional)
3. **Password storage**: Hash passwords (never plaintext)
4. **Audit trail**: All changes logged (immutable)
5. **Connection security**: Use SSL/TLS for connections
6. **Encryption**: Enable encryption at rest
