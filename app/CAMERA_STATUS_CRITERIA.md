# Camera Status Criteria - Complete Explanation

## Overview

The system uses **TWO different status systems** for cameras:

1. **Database Status Field** (`camera.status`): String field in the Camera model
2. **Health-Based Status** (`CameraHealth.status`): Derived from health check records

## System 1: Database Status Field

**Location**: `Camera.status` (string field in database)

**Possible Values**:
- `"pending"` - Camera was just created, not yet verified
- `"active"` - Camera is configured and should be working
- `"offline"` - Camera is marked as offline
- `"error"` - Camera has an error state

**Note**: This field is **NOT used for determining online/offline status** in metrics. It's considered unreliable and potentially stale.

## System 2: Health-Based Status (Used for Metrics)

**Location**: `CameraHealth` records (separate table)

**How It Works**:

### Camera is considered **ONLINE** if:
1. ✅ Has at least one `CameraHealth` record
2. ✅ Latest health record has `status === 'ONLINE'`
3. ✅ Latest health check (`lastCheck`) was **< 60 seconds ago**

### Camera is considered **OFFLINE** if:
- ❌ No `CameraHealth` records exist, OR
- ❌ Latest health record has `status !== 'ONLINE'`, OR
- ❌ Latest health check was **> 60 seconds ago**

## CameraHealth Status Enum

The `CameraHealth.status` field uses an enum with these values:

```typescript
enum CameraStatus {
  ONLINE       // Camera is working normally
  OFFLINE      // Camera is not responding
  DEGRADED     // Camera is working but with issues
  ERROR        // Camera has errors
  MAINTENANCE  // Camera is in maintenance mode
}
```

## Implementation Details

### Function: `isCameraOnline(camera)`

**Location**: `app/app/lib/camera-status.ts`

**Logic**:
```typescript
1. Check if camera has health records
   → If no records: return false (offline)

2. Get most recent health record
   → If no record: return false (offline)

3. Check if status === 'ONLINE'
   → If not ONLINE: return false (offline)

4. Check if lastCheck < 60 seconds ago
   → If > 60 seconds: return false (offline)
   → If < 60 seconds: return true (online)
```

### Why 60 Seconds?

- Health checks should occur every 30-60 seconds
- If no check in 60s, camera is likely offline or health system is down
- Balances responsiveness with network delay tolerance
- Prevents false positives from temporary network hiccups

## Where Status is Used

### Metrics Endpoint (`/api/worksites/[id]/metrics`)
- Uses `isCameraOnline()` function
- **Ignores** `camera.status` string field
- Only uses `CameraHealth` records

### Camera List Endpoint (`/api/cameras`)
- Returns `camera.status` string field (for display)
- But metrics calculations use health-based status

### Frontend Display
- May show `camera.status` for UI purposes
- But online/offline counts use health-based logic

## Health Check System

### CameraHealth Model Fields:
- `status`: CameraStatus enum (ONLINE, OFFLINE, DEGRADED, ERROR, MAINTENANCE)
- `lastCheck`: DateTime of when health was last checked
- `streamQuality`: Float (0-100)
- `frameRate`: Float
- `resolution`: String
- `bitrate`: Int
- `latency`: Int (milliseconds)
- `errors`: Json (array of error messages)

### Health Check Frequency:
- Should occur every 30-60 seconds
- If no check in 60s → camera considered offline

## Example Scenarios

### Scenario 1: Camera is Online
```
CameraHealth record:
  status: ONLINE
  lastCheck: 2024-01-15 10:30:45 (30 seconds ago)
  
Result: ✅ ONLINE
```

### Scenario 2: Camera is Offline (No Recent Check)
```
CameraHealth record:
  status: ONLINE
  lastCheck: 2024-01-15 10:29:00 (90 seconds ago)
  
Result: ❌ OFFLINE (check too old)
```

### Scenario 3: Camera is Offline (Status Not ONLINE)
```
CameraHealth record:
  status: OFFLINE
  lastCheck: 2024-01-15 10:30:45 (30 seconds ago)
  
Result: ❌ OFFLINE (status is not ONLINE)
```

### Scenario 4: Camera is Offline (No Health Records)
```
CameraHealth records: []
  
Result: ❌ OFFLINE (no health data)
```

### Scenario 5: New Camera (Pending)
```
Camera.status: "pending"
CameraHealth records: []
  
Result: ❌ OFFLINE (no health data yet)
```

## Summary

**For determining if a camera is online/offline:**

✅ **Use**: `CameraHealth` records with `isCameraOnline()` function
- Status must be `ONLINE`
- Last check must be < 60 seconds ago

❌ **Don't Use**: `camera.status` string field
- This is for display/configuration purposes only
- Not reliable for real-time status

**The system prioritizes real-time health data over potentially stale database status fields.**

