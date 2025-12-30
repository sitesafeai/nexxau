# Snapshot Service

Service for capturing and storing violation snapshots and video clips.

## Overview

The Snapshot Service:
- Listens to `violations:state_changes` Redis stream
- Captures JPEG snapshots when violations become ACTIVE or ESCALATED
- Optionally captures video clips (5-10 seconds pre/post violation)
- Stores media in S3-compatible object storage (MinIO/S3)
- Generates signed URLs for media access
- Manages retention (default 30 days)
- Stores snapshot metadata in PostgreSQL

## Trigger Conditions

Snapshots are captured ONLY on these state transitions:
- **PENDING → ACTIVE**: First detection (violation confirmed)
- **ACTIVE → ESCALATED**: Violation escalated after persistence

## Architecture

### Data Flow

```
Violation Engine → violations:state_changes (Redis Stream)
                          ↓
Snapshot Service → Capture Snapshot/Clip
                          ↓
                    Upload to S3
                          ↓
                    Store Metadata (PostgreSQL)
                          ↓
                    Generate Signed URL
```

### S3 Storage Layout

```
tenant/{tenant_id}/worksite/{worksite_id}/violations/{violation_id}/
  ├── snapshot.jpg
  └── clip.mp4
```

## Configuration

### Environment Variables

```bash
# Snapshot Capture
FRAMES_BASE_PATH=/tmp/frames
CAPTURE_CLIPS=true
CLIP_DURATION_SECONDS=5
CLIP_PRE_SECONDS=2
CLIP_POST_SECONDS=3

# S3 Storage
S3_ENDPOINT_URL=  # Empty for AWS S3, or http://localhost:9000 for MinIO
S3_BUCKET=violation-snapshots
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1

# Signed URLs
SIGNED_URL_TTL_SECONDS=3600  # 1 hour

# Retention
RETENTION_DAYS=30
ENABLE_RETENTION_WORKER=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexxau
DB_USER=postgres
DB_PASSWORD=your-password
```

## Features

### Snapshot Capture

- Finds frame closest to violation timestamp
- Copies frame to temporary location
- Uploads to S3 with proper layout
- Generates signed URL

### Video Clip Capture

- Collects frames before and after violation timestamp
- Creates MP4 video using FFmpeg
- Configurable duration (default: 5 seconds total)
- Configurable pre/post split (default: 2s pre, 3s post)

### Storage

- S3-compatible storage (AWS S3 or MinIO)
- Organized by tenant/worksite/violation
- Metadata stored in PostgreSQL
- Signed URLs for secure access

### Retention

- Background worker deletes expired snapshots
- Configurable retention period (default: 30 days)
- Deletes from both S3 and database
- Runs periodically (default: every hour)

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export REDIS_HOST=localhost
export S3_BUCKET=violation-snapshots
export S3_ACCESS_KEY=your-key
export S3_SECRET_KEY=your-secret
export DB_PASSWORD=your-password

# Run service
python src/main.py
```

## Database Schema

See `infrastructure/database/migrations/005_violation_snapshots_schema.sql` for the PostgreSQL schema.

**Table: violation_snapshots**
- `snapshot_id`: Primary key (UUID)
- `violation_id`: Foreign key to violations
- `tenant_id`, `worksite_id`, `camera_id`: Identifiers
- `snapshot_type`: 'snapshot' or 'clip'
- `s3_key`: S3 object key (path)
- `s3_bucket`: S3 bucket name
- `file_size_bytes`: File size
- `content_type`: MIME type (image/jpeg, video/mp4)
- `captured_at`: When snapshot was captured
- `violation_timestamp`: Timestamp of violation

## Metrics

Prometheus metrics exposed on port 8000:

- `snapshots_captured_total{snapshot_type,tenant_id}`: Total snapshots captured
- `snapshot_capture_latency_ms`: Snapshot capture latency histogram
- `snapshot_upload_latency_ms`: S3 upload latency histogram

## Testing

```bash
# Run tests
pytest tests/

# Test snapshot capture
pytest tests/test_snapshot_capture.py -v

# Test S3 storage
pytest tests/test_s3_storage.py -v
```

## Dependencies

- **FFmpeg**: Required for video clip creation
  - Install: `brew install ffmpeg` (Mac) or `apt-get install ffmpeg` (Linux)
- **boto3**: AWS SDK for S3 operations
- **psycopg2**: PostgreSQL adapter
- **redis**: Redis client

## Limitations

- Frame timestamp matching uses file modification time (approximation)
- In production, would use frame metadata or sequence numbers
- Video clip creation requires FFmpeg to be installed
- S3 credentials must be configured

## Future Enhancements

- Frame buffer for more accurate timestamp matching
- Support for multiple snapshot formats
- Configurable retention per tenant
- Snapshot compression/optimization
- CDN integration for signed URLs

