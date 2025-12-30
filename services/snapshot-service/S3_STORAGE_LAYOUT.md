# S3 Storage Layout

Documentation for S3 storage layout and signed URL generation.

## Storage Layout

### Directory Structure

```
tenant/{tenant_id}/worksite/{worksite_id}/violations/{violation_id}/
  ├── snapshot.jpg
  └── clip.mp4
```

### Example Paths

**Snapshot:**
```
tenant/550e8400-e29b-41d4-a716-446655440000/worksite/660e8400-e29b-41d4-a716-446655440001/violations/770e8400-e29b-41d4-a716-446655440002/snapshot.jpg
```

**Video Clip:**
```
tenant/550e8400-e29b-41d4-a716-446655440000/worksite/660e8400-e29b-41d4-a716-446655440001/violations/770e8400-e29b-41d4-a716-446655440002/clip.mp4
```

## S3 Key Generation

The `S3Storage.get_s3_key()` method generates keys using this format:

```python
s3_key = f"tenant/{tenant_id}/worksite/{worksite_id}/violations/{violation_id}/{filename}"
```

Where:
- `tenant_id`: Tenant UUID
- `worksite_id`: Worksite UUID
- `violation_id`: Violation UUID
- `filename`: Either `snapshot.jpg` or `clip.mp4`

## Signed URLs

### Generation

Signed URLs are generated using AWS S3 presigned URL API:

```python
signed_url = s3_storage.generate_signed_url(
    s3_key="tenant/.../violations/.../snapshot.jpg",
    expiration_seconds=3600  # 1 hour default
)
```

### Configuration

- **TTL**: Configurable via `SIGNED_URL_TTL_SECONDS` (default: 3600 seconds = 1 hour)
- **Security**: URLs expire after TTL, preventing long-term access
- **Format**: Standard S3 presigned URL format

### Example Signed URL

```
https://s3.amazonaws.com/violation-snapshots/tenant/.../snapshot.jpg?X-Amz-Algorithm=...&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=...
```

## Retention

### Default Retention

- **Period**: 30 days (configurable via `RETENTION_DAYS`)
- **Worker**: Background process runs every hour (configurable)
- **Deletion**: Removes files from both S3 and database

### Retention Process

1. Worker queries database for snapshots older than retention period
2. Deletes file from S3
3. Deletes metadata from PostgreSQL
4. Logs deletion for audit

### Retention Query

```sql
SELECT * FROM violation_snapshots
WHERE captured_at < NOW() - INTERVAL '30 days'
ORDER BY captured_at ASC;
```

## Access Patterns

### Get Snapshots for Violation

```python
snapshots = repository.get_snapshots_by_violation(violation_id)
for snapshot in snapshots:
    signed_url = s3_storage.generate_signed_url(
        snapshot.s3_key,
        expiration_seconds=3600
    )
    print(f"{snapshot.snapshot_type}: {signed_url}")
```

### Get Expired Snapshots (Retention)

```python
expired = repository.get_expired_snapshots(retention_days=30)
for snapshot in expired:
    s3_storage.delete_file(snapshot.s3_key)
    repository.delete_snapshot_metadata(snapshot.snapshot_id)
```

## MinIO Configuration

For local development with MinIO:

```bash
S3_ENDPOINT_URL=http://localhost:9000
S3_BUCKET=violation-snapshots
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1
```

## AWS S3 Configuration

For production with AWS S3:

```bash
# Leave S3_ENDPOINT_URL empty
S3_ENDPOINT_URL=
S3_BUCKET=violation-snapshots-prod
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
S3_REGION=us-east-1
```

## File Naming

- **Snapshots**: Always named `snapshot.jpg`
- **Clips**: Always named `clip.mp4`
- **Uniqueness**: Enforced by S3 key path (includes violation_id)

## Metadata Storage

Each snapshot/clip has metadata stored in PostgreSQL:

- `snapshot_id`: Unique identifier
- `violation_id`: Links to violation
- `s3_key`: Full S3 path
- `s3_bucket`: Bucket name
- `file_size_bytes`: File size
- `content_type`: MIME type
- `captured_at`: Capture timestamp
- `violation_timestamp`: Violation timestamp

## Best Practices

1. **Signed URLs**: Generate on-demand, don't store long-term
2. **Retention**: Configure based on compliance requirements
3. **Bucket Policy**: Set appropriate IAM policies for S3 access
4. **Monitoring**: Track storage usage and retention metrics
5. **Backup**: Consider lifecycle policies for archival

