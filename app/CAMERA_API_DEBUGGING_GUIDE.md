# Camera API Debugging Guide

## Current Status
The `/api/cameras` endpoint is still returning 500 errors and timeouts. This guide helps identify the exact failure point.

## Enhanced Instrumentation Added

### 1. Database Connection Check
- Added at the very start of the request
- 3 second timeout
- Returns 503 if database is unreachable

### 2. Session Lookup Timeout
- Added 5 second timeout to `getServerSession()`
- Returns 504 if session lookup times out

### 3. All Database Queries Have Timeouts
- User query: 10 seconds
- Worksite check: 10 seconds
- Camera query: 15 seconds

### 4. Request ID Tracking
- Every request gets unique `requestId`
- All logs include `[requestId]` for correlation
- Format: `req_${timestamp}_${random}`

## How to Debug

### Step 1: Check Server Logs
Look for logs with the pattern `[API /cameras] [req_...]`:

```bash
# In your terminal where Next.js is running, look for:
[API /cameras] [req_1234567890_abc123] GET request received
[API /cameras] [req_1234567890_abc123] Database connection check: OK
[API /cameras] [req_1234567890_abc123] Step 1: Validating session...
[API /cameras] [req_1234567890_abc123] Session lookup took Xms
[API /cameras] [req_1234567890_abc123] Step 2: Fetching user from database...
[API /cameras] [req_1234567890_abc123] User query took Xms
...
```

### Step 2: Identify Failure Point
The last log message before the error tells you where it failed:

- **No logs at all** → Request not reaching the handler (Next.js routing issue)
- **Stops at "Database connection check"** → Database connection problem
- **Stops at "Step 1: Validating session"** → Session lookup hanging
- **Stops at "Step 2: Fetching user"** → User query hanging
- **Stops at "Step 3: Parsing query parameters"** → URL parsing issue
- **Stops at "Step 4: Validating worksite access"** → Worksite query hanging
- **Stops at "Step 5: Querying cameras"** → Camera query hanging
- **Stops at "Step 6: Formatting camera data"** → Data formatting issue

### Step 3: Check Error Response
The frontend now shows specific error messages:
- `"Database unavailable"` → Database connection failed (503)
- `"Request timeout"` → One of the queries timed out (504)
- `"Unauthorized"` → Session/auth issue (401)
- `"Access denied"` → Permission issue (403)
- `"Worksite not found"` → Invalid worksiteId (404)
- Generic error → Check server logs for details

### Step 4: Common Issues

#### Issue: Database Connection Timeout
**Symptoms**: Logs show "Database connection check" but then error
**Fix**: 
- Check `DATABASE_URL` in `.env`
- Verify database is running
- Check network connectivity

#### Issue: Session Lookup Timeout
**Symptoms**: Logs show "Step 1: Validating session" but then timeout
**Fix**:
- Check `NEXTAUTH_SECRET` in `.env`
- Verify NextAuth configuration
- Check if session store is accessible

#### Issue: User Query Timeout
**Symptoms**: Logs show "Step 2: Fetching user" but then timeout
**Fix**:
- Check if `User` table exists
- Verify database indexes on `email` field
- Check database performance

#### Issue: Camera Query Timeout
**Symptoms**: Logs show "Step 5: Querying cameras" but then timeout
**Fix**:
- Check if `Camera` table exists
- Verify database indexes on `worksiteId` field
- Check if there are too many cameras (pagination needed)

## Testing Checklist

1. **Check if request reaches handler**:
   - Look for `[API /cameras] [req_...] GET request received`
   - If missing, check Next.js routing

2. **Check database connection**:
   - Look for `Database connection check: OK`
   - If missing or error, database is unreachable

3. **Check session**:
   - Look for `Session lookup took Xms`
   - If timeout, NextAuth is hanging

4. **Check user query**:
   - Look for `User query took Xms`
   - If timeout, database query is slow

5. **Check camera query**:
   - Look for `Camera query took Xms`
   - If timeout, camera query is slow or hanging

## Next Steps

1. **Run the request** and capture all server logs
2. **Identify the last log message** before the error
3. **Check the error response** in the frontend
4. **Fix the specific issue** based on the failure point
5. **Re-test** and verify the fix

## Expected Log Flow (Success)

```
[API /cameras] [req_...] GET request received
[API /cameras] [req_...] Database connection check: OK (Xms)
[API /cameras] [req_...] Step 1: Validating session...
[API /cameras] [req_...] Session lookup took Xms
[API /cameras] [req_...] Session validated. User: email@example.com
[API /cameras] [req_...] Step 2: Fetching user from database...
[API /cameras] [req_...] User query took Xms
[API /cameras] [req_...] User validated. ID: ...
[API /cameras] [req_...] Step 3: Parsing query parameters...
[API /cameras] [req_...] worksiteId from query: ...
[API /cameras] [req_...] Step 4: Validating worksite access...
[API /cameras] [req_...] Worksite check took Xms
[API /cameras] [req_...] ✅ All guards passed
[API /cameras] [req_...] Step 5: Querying cameras from database...
[API /cameras] [req_...] Camera query took Xms
[API /cameras] [req_...] Cameras found: X
[API /cameras] [req_...] Step 6: Formatting camera data...
[API /cameras] [req_...] Formatting took Xms
[API /cameras] [req_...] ✅ Successfully returning X cameras (total: Xms)
```

## If Still Failing

1. **Share the server logs** (with request IDs)
2. **Share the error response** from frontend
3. **Check database** is accessible: `npx prisma db pull`
4. **Check NextAuth** is working: Try logging in/out
5. **Check Prisma** client: `npx prisma generate`

