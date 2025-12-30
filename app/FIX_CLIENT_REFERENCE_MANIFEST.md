# Fix: clientReferenceManifest Error

## Quick Fix Steps

1. **Stop the dev server** (Ctrl+C)

2. **Clear all caches:**
   ```bash
   cd app
   rm -rf .next
   rm -rf node_modules/.cache
   rm -rf .swc
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## If the error persists:

### Option 1: Full Clean Rebuild
```bash
cd app
rm -rf .next node_modules/.cache .swc
npm run build
npm run dev
```

### Option 2: Check for Server/Client Component Issues

The error can occur if a client component is imported in a server component. Verify:

- `CameraStreamViewer.tsx` has `'use client'` at the top ✅
- `UserDashboard.tsx` has `'use client'` at the top ✅
- No server components are importing client components incorrectly

### Option 3: Update Next.js (if needed)
```bash
cd app
npm install next@latest
```

## Root Cause

This error typically happens when:
- Build cache is corrupted
- Server/client component boundary is violated
- Next.js version has a bug (15.5.9 known issue)

## Verification

After clearing cache and restarting, the error should be gone. If it persists, check the browser console and server logs for more details.

