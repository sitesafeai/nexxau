# Camera API 500 Error & Timeout Fix

## Root Cause Analysis

**Problem**: `/api/cameras?worksiteId=...` was returning 500 Internal Server Error and timing out.

**Root Causes Identified**:

1. **No timeout guards on database queries**: Prisma queries could hang indefinitely if the database connection was slow or unresponsive
2. **No request deduplication**: Frontend could fire multiple overlapping requests, causing race conditions
3. **No AbortController on frontend**: Frontend fetch had no timeout, waiting indefinitely for responses
4. **Insufficient error differentiation**: All errors returned generic 500, making debugging impossible
5. **No structured logging**: Could not trace where exactly the request was failing

## Backend Fixes (`app/app/api/cameras/route.ts`)

### 1. Added Request ID Tracking
- Every request gets a unique `requestId` for tracing
- All logs include `[requestId]` for correlation

### 2. Added Timeout Guards to All Database Queries
- **User query**: 10 second timeout
- **Worksite check**: 10 second timeout  
- **Camera query**: 15 second timeout
- Uses `Promise.race()` to enforce timeouts

### 3. Structured Logging with Timestamps
- Logs each step with duration:
  - Session lookup duration
  - User query duration
  - Worksite check duration
  - Camera query duration
  - Formatting duration
  - Total request duration

### 4. Enhanced Error Handling
- Differentiates timeout errors (504) from other errors (500)
- Logs full error details: name, message, stack, code, meta
- Returns appropriate HTTP status codes:
  - `401` - Unauthorized
  - `403` - Forbidden
  - `404` - Not Found
  - `500` - Server Error
  - `504` - Gateway Timeout

### 5. Explicit Error Responses
- All error paths return `NextResponse.json()` immediately
- No hanging requests
- All async operations properly awaited

## Frontend Fixes (`app/app/components/camera/CameraManagementTab.tsx`)

### 1. Request Deduplication
- Uses `fetchInProgressRef` to prevent overlapping requests
- Skips new requests if one is already in progress

### 2. AbortController with Timeout
- Creates `AbortController` for each request
- 30 second timeout on frontend fetch
- Cancels previous request if new one starts

### 3. Enhanced Error Differentiation
- Handles different HTTP status codes:
  - `401` - "Unauthorized. Please log in again."
  - `403` - "Access denied. You do not have permission..."
  - `404` - "Worksite not found."
  - `504` - "Request timed out. The server took too long to respond."
  - `500` - Shows server error message
- Distinguishes network errors from timeout errors

### 4. Structured Logging
- Logs request start, duration, and completion
- Logs response data structure
- Logs errors with full context

## Testing Checklist

✅ **Backend**:
- [x] All database queries have timeout guards
- [x] All error paths return responses
- [x] Structured logging with request IDs
- [x] Timeout errors return 504 status

✅ **Frontend**:
- [x] AbortController prevents hanging requests
- [x] Request deduplication prevents overlapping calls
- [x] Error messages differentiate error types
- [x] Network errors handled separately

## Expected Behavior After Fix

1. **Fast responses**: Database queries timeout after 10-15 seconds max
2. **Clear errors**: Users see specific error messages (401, 403, 404, 504, 500)
3. **No hanging**: Requests always complete or timeout within 30 seconds
4. **No duplicates**: Only one request in flight at a time
5. **Traceable**: Server logs show exactly where requests fail with request IDs

## Monitoring

Check server logs for:
- `[API /cameras] [req_...]` - Request IDs for correlation
- Duration logs - Identify slow queries
- Error logs - Full stack traces for debugging
- Timeout logs - Identify when queries exceed limits

## Next Steps if Issues Persist

1. **Check database connection**: Verify Prisma can connect to database
2. **Check database performance**: Slow queries may indicate missing indexes
3. **Check network**: Verify no network issues between Next.js and database
4. **Check session**: Verify `getServerSession()` is not hanging
5. **Review logs**: Use request IDs to trace specific failing requests

