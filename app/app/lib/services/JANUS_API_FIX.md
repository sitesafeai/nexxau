# Janus API Fix - Production Hardening

## Problem

The application was failing with `Janus.create method not found` error. This occurred because the code was attempting to use a non-existent API method.

## Root Cause

The Janus JavaScript library uses the **legacy API pattern**:
- `Janus.init({ debug: false, callback: () => { ... } })` - Initialize library
- `new Janus({ server: url, success: (session) => { ... }, error: (error) => { ... } })` - Create session

**There is NO `Janus.create()` method.** The previous code incorrectly assumed this method existed.

## Solution

### 1. Fixed janusLoader.ts

**Changes:**
- Removed check for `Janus.create` (doesn't exist)
- Added API version detection (legacy vs modern)
- Added strict API contract validation
- Added version locking to prevent mismatches
- Fail fast with descriptive errors if API contract is wrong

**Key Features:**
- Validates required methods: `Janus.init`
- Detects API version by checking for modern API methods
- Fails immediately if wrong API version is detected
- Logs detected API version for debugging

### 2. Fixed janusClient.ts

**Changes:**
- Replaced `Janus.create({...})` with `new Janus({...})`
- Added API verification before session creation
- Added comprehensive comments explaining the correct API usage
- Removed all references to non-existent `Janus.create`

**Key Features:**
- Uses correct legacy API: `new Janus({ server, success, error, destroyed, transportClosed })`
- Constructor returns session object immediately
- Success callback is called when session is actually connected
- Proper error handling for API mismatches

### 3. Defensive Guarantees

**API Validation:**
- `janusLoader.ts` validates API contract at load time
- Fails with `API_MISMATCH` error if wrong API detected
- Prevents silent failures

**Version Locking:**
- Expected API version: `legacy`
- Detected version is logged and validated
- Mismatch causes immediate failure

**Regression Prevention:**
- Clear documentation in code comments
- Explicit API contract validation
- No silent fallbacks - all errors are surfaced

## Which Janus API is Used

**Legacy API (Current Implementation):**
```javascript
// Initialize
Janus.init({
  debug: false,
  callback: () => {
    // Library initialized
  }
});

// Create session
const session = new Janus({
  server: 'wss://janus.example.com/janus',
  success: (session) => {
    // Session connected
  },
  error: (error) => {
    // Connection failed
  },
  destroyed: () => {
    // Session destroyed
  },
  transportClosed: () => {
    // Transport closed
  }
});
```

## Why Janus.create is Invalid

The Janus JavaScript library (legacy version) does not expose a `create` method. Session creation is done via the `new Janus()` constructor pattern. The library uses a constructor function that:

1. Takes configuration object with callbacks
2. Returns session object immediately
3. Calls success callback when connection is established
4. Calls error callback if connection fails

This is a fundamental API design difference. The code was incorrectly assuming a factory method pattern (`Janus.create()`) when the library actually uses a constructor pattern (`new Janus()`).

## How Future Mismatches are Prevented

### 1. Load-Time Validation
- `janusLoader.ts` validates API contract before resolving
- Checks for required methods explicitly
- Detects API version and validates against expected version
- Throws `JanusLoaderError` with `API_MISMATCH` code if validation fails

### 2. Runtime Guards
- `janusClient.ts` verifies Janus constructor is available before use
- Throws descriptive error if constructor is missing
- All API calls are validated before execution

### 3. Clear Documentation
- Comprehensive comments explaining correct API usage
- Examples showing correct pattern
- Warnings about incorrect patterns

### 4. Fail Fast, Fail Loud
- No silent fallbacks
- All errors are surfaced immediately
- Descriptive error messages
- Error codes for programmatic handling

### 5. Version Locking
- Expected API version stored in code: `EXPECTED_API_VERSION = 'legacy'`
- Detected version logged and validated
- Mismatch causes immediate failure with clear error message

## Testing

To verify the fix:

1. **Load Janus library:**
   ```javascript
   const Janus = await JanusLoader.load();
   // Should log: "Detected Janus API version: legacy"
   ```

2. **Create session:**
   ```javascript
   const session = new Janus({
     server: 'wss://janus.example.com/janus',
     success: (session) => console.log('Connected'),
     error: (error) => console.error('Failed', error)
   });
   ```

3. **Verify no Janus.create:**
   ```javascript
   // This should NOT exist
   console.log(typeof Janus.create); // Should be 'undefined'
   ```

## Files Modified

1. `app/app/lib/services/janusLoader.ts`
   - Removed `Janus.create` check
   - Added API version detection
   - Added strict validation
   - Added version locking

2. `app/app/lib/services/janusClient.ts`
   - Replaced `Janus.create()` with `new Janus()`
   - Added API verification
   - Added comprehensive documentation

## Impact

- **Before:** Application failed with `Janus.create method not found`
- **After:** Application correctly uses `new Janus()` constructor
- **Prevention:** API mismatches are detected and fail fast with clear errors
- **Reliability:** No silent failures, all errors are surfaced

## Notes

- The Janus library file (`/public/libs/janus.js`) was not modified
- All changes are in the client code that uses Janus
- The fix is backward compatible (uses the same legacy API)
- Future API changes will be caught by validation logic

