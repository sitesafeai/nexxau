# Database Schema Usage

Documentation for database schema usage in the Acknowledgement System.

## Overview

The Acknowledgement System uses the existing `acknowledgements` table from the initial schema migration (`001_initial_schema.sql`).

## Schema Definition

### Acknowledgements Table

```sql
CREATE TABLE acknowledgements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- One acknowledgement per user per violation
    CONSTRAINT acknowledgements_user_violation_unique UNIQUE (user_id, violation_id)
);
```

### Indexes

```sql
CREATE INDEX idx_acknowledgements_tenant_id ON acknowledgements(tenant_id);
CREATE INDEX idx_acknowledgements_violation_id ON acknowledgements(violation_id);
CREATE INDEX idx_acknowledgements_user_id ON acknowledgements(user_id);
CREATE INDEX idx_acknowledgements_acknowledged_at ON acknowledgements(acknowledged_at DESC);
```

## Field Usage

### id (UUID, Primary Key)

**Purpose**: Unique identifier for each acknowledgement record.

**Usage**:
- Generated using `uuid_generate_v4()`
- Used as primary key
- Returned to clients after acknowledgement creation

**Example**:
```sql
SELECT id FROM acknowledgements WHERE violation_id = '...';
```

### tenant_id (UUID, Foreign Key)

**Purpose**: Tenant isolation - links acknowledgement to tenant.

**Usage**:
- Required for all acknowledgements
- Enables tenant-scoped queries
- Foreign key to `tenants(id)` with CASCADE delete

**Example**:
```sql
SELECT * FROM acknowledgements WHERE tenant_id = '...';
```

### violation_id (UUID, Foreign Key)

**Purpose**: Links acknowledgement to the violated violation.

**Usage**:
- Required for all acknowledgements
- Foreign key to `violations(id)` with CASCADE delete
- Indexed for fast lookups
- Unique constraint with `user_id` (one ACK per user per violation)

**Example**:
```sql
SELECT * FROM acknowledgements WHERE violation_id = '...';
```

### user_id (UUID, Foreign Key)

**Purpose**: Identifies the user who acknowledged the violation.

**Usage**:
- Required for all acknowledgements
- Foreign key to `users(id)` with CASCADE delete
- Unique constraint with `violation_id` (one ACK per user per violation)
- Enables user-specific queries

**Example**:
```sql
SELECT * FROM acknowledgements WHERE user_id = '...';
```

### acknowledged_at (TIMESTAMP WITH TIME ZONE)

**Purpose**: Timestamp when acknowledgement occurred.

**Usage**:
- Defaults to `NOW()` if not specified
- Used for escalation timeout calculations
- Indexed (DESC) for time-based queries
- Tracked for audit and compliance

**Example**:
```sql
SELECT * FROM acknowledgements 
WHERE acknowledged_at > NOW() - INTERVAL '1 day'
ORDER BY acknowledged_at DESC;
```

### note (TEXT, Nullable)

**Purpose**: Optional note from user when acknowledging.

**Usage**:
- Stores user-provided notes
- Also stores acknowledgement method as prefix: `[method] note_text`
- Methods: `[web]`, `[email_link]`, `[sms]`
- Can be NULL if no note provided

**Method Storage Format**:
- Web: `[web] Optional user note`
- Email Link: `[email_link] Optional user note`
- SMS: `[sms] Optional user note`

**Example**:
```sql
-- Insert with method in note
INSERT INTO acknowledgements (..., note) 
VALUES (..., '[email_link] Acknowledged via email');

-- Query and parse method
SELECT note FROM acknowledgements WHERE violation_id = '...';
```

### created_at (TIMESTAMP WITH TIME ZONE)

**Purpose**: Timestamp when record was created.

**Usage**:
- Defaults to `NOW()`
- Usually same as `acknowledged_at` but can differ
- Useful for audit trails

## Common Queries

### Check if Violation is Acknowledged

```sql
SELECT EXISTS(
    SELECT 1 FROM acknowledgements 
    WHERE violation_id = $1
) AS is_acknowledged;
```

### Get First Acknowledgement for Violation

```sql
SELECT * FROM acknowledgements
WHERE violation_id = $1
ORDER BY acknowledged_at ASC
LIMIT 1;
```

### Get All Acknowledgements for Violation

```sql
SELECT 
    id,
    user_id,
    acknowledged_at,
    note,
    method  -- Parsed from note field
FROM acknowledgements
WHERE violation_id = $1
ORDER BY acknowledged_at DESC;
```

### Get Acknowledgements by User

```sql
SELECT 
    a.*,
    v.violation_type,
    v.state
FROM acknowledgements a
JOIN violations v ON a.violation_id = v.id
WHERE a.user_id = $1
ORDER BY a.acknowledged_at DESC;
```

### Get Unacknowledged Violations (for Escalation)

```sql
SELECT v.*
FROM violations v
WHERE v.state IN ('ACTIVE', 'ESCALATED')
AND NOT EXISTS (
    SELECT 1 FROM acknowledgements a 
    WHERE a.violation_id = v.id
)
AND v.created_at < NOW() - INTERVAL '30 minutes';
```

### Get Acknowledged but Unresolved Violations (for Escalation)

```sql
SELECT v.*
FROM violations v
WHERE v.state IN ('ACTIVE', 'ESCALATED')
AND EXISTS (
    SELECT 1 FROM acknowledgements a 
    WHERE a.violation_id = v.id
)
AND v.created_at < NOW() - INTERVAL '60 minutes';
```

## Method Tracking

### Current Implementation

Methods are stored in the `note` field with a prefix format:

```python
# Method prefixes
"[web]"           # Web acknowledgement
"[email_link]"    # Email link acknowledgement
"[sms]"           # SMS acknowledgement

# Examples
"[web] User acknowledged violation"
"[email_link]"  # No note
"[sms] ACK"     # SMS acknowledgement with note
```

### Parsing Method from Note

```python
def parse_method_from_note(note: Optional[str]) -> AcknowledgementMethod:
    if not note:
        return AcknowledgementMethod.WEB  # Default
    
    if note.startswith('[email_link]'):
        return AcknowledgementMethod.EMAIL_LINK
    elif note.startswith('[sms]'):
        return AcknowledgementMethod.SMS
    elif note.startswith('[web]'):
        return AcknowledgementMethod.WEB
    else:
        return AcknowledgementMethod.WEB  # Default
```

### Future Enhancement: Dedicated Method Column

For better querying and performance, consider adding a dedicated `method` column:

```sql
-- Migration to add method column
ALTER TABLE acknowledgements
ADD COLUMN method VARCHAR(20) CHECK (method IN ('web', 'email_link', 'sms'));

-- Create index for method queries
CREATE INDEX idx_acknowledgements_method ON acknowledgements(method);

-- Migrate existing data
UPDATE acknowledgements
SET method = CASE
    WHEN note LIKE '[email_link]%' THEN 'email_link'
    WHEN note LIKE '[sms]%' THEN 'sms'
    ELSE 'web'
END
WHERE method IS NULL;
```

## Unique Constraint

### Constraint: acknowledgements_user_violation_unique

**Purpose**: Ensures one acknowledgement per user per violation.

**Constraint Definition**:
```sql
CONSTRAINT acknowledgements_user_violation_unique 
UNIQUE (user_id, violation_id)
```

**Behavior**:
- Prevents duplicate acknowledgements from same user
- Allows multiple users to acknowledge same violation
- Foreign key constraint ensures data integrity

**Example**:
```sql
-- First acknowledgement: SUCCESS
INSERT INTO acknowledgements (violation_id, user_id, ...) 
VALUES ('violation-123', 'user-456', ...);

-- Second acknowledgement from same user: FAIL (duplicate)
INSERT INTO acknowledgements (violation_id, user_id, ...) 
VALUES ('violation-123', 'user-456', ...);
-- Error: duplicate key value violates unique constraint

-- Acknowledgement from different user: SUCCESS
INSERT INTO acknowledgements (violation_id, user_id, ...) 
VALUES ('violation-123', 'user-789', ...);
```

## Index Usage

### idx_acknowledgements_tenant_id

**Purpose**: Fast tenant-scoped queries.

**Usage**:
- Tenant dashboard queries
- Tenant-specific reporting
- Multi-tenant isolation

**Query Example**:
```sql
SELECT * FROM acknowledgements WHERE tenant_id = $1;
```

### idx_acknowledgements_violation_id

**Purpose**: Fast violation lookups.

**Usage**:
- Check if violation is acknowledged
- Get all acknowledgements for violation
- Violation detail page queries

**Query Example**:
```sql
SELECT * FROM acknowledgements WHERE violation_id = $1;
```

### idx_acknowledgements_user_id

**Purpose**: Fast user-specific queries.

**Usage**:
- User activity queries
- User acknowledgement history
- User dashboard queries

**Query Example**:
```sql
SELECT * FROM acknowledgements WHERE user_id = $1;
```

### idx_acknowledgements_acknowledged_at

**Purpose**: Time-based queries and sorting.

**Usage**:
- Recent acknowledgements
- Time-based reporting
- Escalation timeout calculations
- Audit queries

**Query Example**:
```sql
SELECT * FROM acknowledgements 
WHERE acknowledged_at > NOW() - INTERVAL '1 day'
ORDER BY acknowledged_at DESC;
```

## Data Relationships

### Relationship Diagram

```
tenants
  ├── violations (1:N)
  │     ├── acknowledgements (1:N)
  │     └── ...
  └── users (1:N)
        └── acknowledgements (1:N)
```

### Cascading Deletes

- **Tenant deleted**: All acknowledgements cascade deleted
- **Violation deleted**: All acknowledgements cascade deleted
- **User deleted**: All acknowledgements cascade deleted

This ensures data consistency and prevents orphaned records.

## Performance Considerations

### High-Write Table

The `acknowledgements` table is a high-write table. Consider:

1. **Partitioning** (if needed):
   ```sql
   -- Monthly partitioning by acknowledged_at
   CREATE TABLE acknowledgements_2024_01 
   PARTITION OF acknowledgements
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   ```

2. **Connection Pooling**: Use connection pools to handle concurrent writes

3. **Batch Inserts**: Batch multiple acknowledgements if possible

### Query Optimization

- Use indexes for WHERE clauses
- Use LIMIT for pagination
- Use EXISTS for existence checks (more efficient than COUNT)

## Migration Path

### Adding Method Column (Future)

If adding a dedicated `method` column:

1. Add column (nullable initially)
2. Migrate existing data from `note` field
3. Set NOT NULL constraint
4. Create index
5. Update application code to use `method` column

