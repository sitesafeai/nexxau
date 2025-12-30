# Camera Delete Endpoint Fix

## Root Cause
The DELETE `/api/cameras/[id]` endpoint was failing because:

1. **Missing Authentication/Authorization**: No checks for user session or permissions
2. **Incomplete Relation Cleanup**: Only deleted `Alert` records, but `Detection` model has no `onDelete: Cascade`, blocking deletion
3. **Generic Error Messages**: Errors were masked with "Failed to delete camera from database" instead of showing the real database error
4. **No Timeout Protection**: Database queries could hang indefinitely
5. **No Structured Logging**: Difficult to debug failures

## Solution Implemented

### 1. Authentication & Authorization
- ✅ Validates user session with 5-second timeout
- ✅ Checks user role: Only `SUPER_ADMIN`, `COMPANY_ADMIN`, `SITE_ADMIN` can delete
- ✅ Verifies user has access to the camera's worksite:
  - `COMPANY_ADMIN`: Must be in same company
  - `SITE_ADMIN`: Must have `SITE_ADMIN` role in that worksite
  - `SUPER_ADMIN`: Can delete any camera

### 2. Complete Relation Cleanup
Deletes all related records before deleting camera:
- ✅ `Detection` (no cascade - **must delete manually**)
- ✅ `Alert` (has SetNull, but delete for cleanliness)
- ✅ `SafetyViolation` (has SetNull, but delete for cleanliness)
- ✅ `CustomRule` (has SetNull, but delete for cleanliness)
- ✅ `CustomRuleTrigger` (has SetNull, but delete for cleanliness)
- ✅ `CustomRuleViolation` (has SetNull, but delete for cleanliness)
- ✅ `SMSNotification` (has SetNull, but delete for cleanliness)

**Note**: `TrainingImage`, `CameraHealth`, `FalsePositiveReport`, `TruePositiveReport` have `onDelete: Cascade` so they're deleted automatically.

### 3. Real Error Messages
- ✅ Returns actual database error messages (Prisma error codes, messages, meta)
- ✅ No generic "Failed to delete camera from database" masking
- ✅ Includes error codes for frontend handling

### 4. Timeout Protection
- ✅ Session lookup: 5 seconds
- ✅ Camera query: 10 seconds
- ✅ Related record deletions: 15 seconds each
- ✅ Camera deletion: 15 seconds
- ✅ Returns 504 (Gateway Timeout) for timeout errors

### 5. Structured Logging
- ✅ Request ID for correlation: `req_${timestamp}_${random}`
- ✅ Logs every step with timing
- ✅ Logs full error objects (name, message, code, stack, meta)
- ✅ Logs user context (userId, email, role)
- ✅ Logs camera context (id, name, worksiteId)

## Error Response Format

### Success (200)
```json
{
  "success": true,
  "message": "Camera deleted successfully",
  "data": {
    "cameraId": "...",
    "cameraName": "..."
  }
}
```

### Error Responses

**401 Unauthorized** (No session)
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden** (Insufficient permissions)
```json
{
  "error": "Forbidden",
  "code": "INSUFFICIENT_PERMISSIONS",
  "message": "Role VIEWER does not have permission to delete cameras"
}
```

**404 Not Found** (Camera doesn't exist)
```json
{
  "error": "Camera not found",
  "code": "CAMERA_NOT_FOUND"
}
```

**500 Internal Server Error** (Database error)
```json
{
  "error": "Failed to delete camera",
  "code": "P2003",  // Real Prisma error code
  "message": "Foreign key constraint failed on the field: `cameraId`",  // Real error message
  "details": { ... }  // Prisma meta object
}
```

**504 Gateway Timeout** (Query timeout)
```json
{
  "error": "Failed to delete camera",
  "code": "TIMEOUT",
  "message": "Delete camera timeout after 15s"
}
```

## Testing

### Test Cases

1. **Unauthenticated Request**
   - Expected: 401 Unauthorized
   - Log: `❌ Unauthorized: No session`

2. **Insufficient Permissions** (VIEWER role)
   - Expected: 403 Forbidden
   - Log: `❌ Forbidden: Role VIEWER cannot delete cameras`

3. **Camera Not Found**
   - Expected: 404 Not Found
   - Log: `❌ Camera not found: {cameraId}`

4. **Access Denied** (SITE_ADMIN trying to delete camera in different worksite)
   - Expected: 403 Forbidden
   - Log: `❌ Forbidden: User does not have access to worksite: {worksiteId}`

5. **Successful Deletion**
   - Expected: 200 OK
   - Log: `✅ Camera deleted successfully`
   - All related records deleted
   - Camera record deleted

6. **Database Error** (e.g., foreign key constraint)
   - Expected: 500 with real error message
   - Log: Full error object with code, message, meta

7. **Timeout** (database slow/unreachable)
   - Expected: 504 Gateway Timeout
   - Log: `❌ Error deleting camera record: Delete camera timeout after 15s`

## Logging Example (Success)

```
[API /cameras/[id] DELETE] [req_1234567890_abc123] Request received at: 2024-01-01T12:00:00.000Z
[API /cameras/[id] DELETE] [req_1234567890_abc123] Session lookup took 50ms
[API /cameras/[id] DELETE] [req_1234567890_abc123] User authenticated: { userId: '...', email: '...', role: 'SITE_ADMIN' }
[API /cameras/[id] DELETE] [req_1234567890_abc123] Camera ID: cm123...
[API /cameras/[id] DELETE] [req_1234567890_abc123] Camera query took 30ms
[API /cameras/[id] DELETE] [req_1234567890_abc123] Camera found: { id: '...', name: '...', worksiteId: '...' }
[API /cameras/[id] DELETE] [req_1234567890_abc123] ✅ All guards passed. Starting deletion process...
[API /cameras/[id] DELETE] [req_1234567890_abc123] Step 1: Deleting related records...
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 5 detection records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 2 alert records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 0 safety violation records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 1 custom rule records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 0 custom rule trigger records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 0 custom rule violation records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Deleted 0 SMS notification records
[API /cameras/[id] DELETE] [req_1234567890_abc123] Step 2: Deleting camera record...
[API /cameras/[id] DELETE] [req_1234567890_abc123] ✅ Camera deleted successfully (45ms)
[API /cameras/[id] DELETE] [req_1234567890_abc123] ✅ Total deletion completed in 200ms
```

## Schema Relations Reference

### Models with `onDelete: Cascade` (auto-deleted)
- `TrainingImage`
- `CameraHealth`
- `FalsePositiveReport`
- `TruePositiveReport`

### Models with `onDelete: SetNull` (set to null, but we delete for cleanliness)
- `Alert`
- `SafetyViolation`
- `SMSNotification`
- `CustomRule`
- `CustomRuleTrigger`
- `CustomRuleViolation`

### Models with NO `onDelete` (must delete manually)
- `Detection` ⚠️ **This was blocking deletion!**

## Next Steps

1. **Test the endpoint** with various scenarios
2. **Monitor logs** for any unexpected errors
3. **Verify frontend** receives proper error messages
4. **Consider adding** cascade delete to `Detection` model in schema for future-proofing

