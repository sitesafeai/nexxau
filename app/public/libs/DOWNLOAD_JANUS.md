# Download Janus.js Instructions

## Current Status

⚠️ **The janus.js file needs to be downloaded manually.**

The npm package installation may not include the built JavaScript file, or it may be in a different location.

## Quick Download Options

### Option 1: Direct Download from Repository (Recommended)

The Janus JavaScript client is available in the repository. You can:

1. Visit: https://github.com/meetecho/janus-gateway
2. Look for demo files or download from releases
3. The file is typically named `janus.js` or `janus.min.js`

### Option 2: Use wget/curl from Known CDN

Try downloading from the official CDN (if available):

```bash
cd /Users/luizcarneiro/nexxau/app/public/libs
curl -L -o janus.js https://janus.conf.meetecho.com/janus.js
```

### Option 3: Clone Repository and Copy

```bash
cd /tmp
git clone https://github.com/meetecho/janus-gateway.git
cd janus-gateway
# Find janus.js in the repository (typically in html/ or demo/ directory)
cp html/janus.js /Users/luizcarneiro/nexxau/app/public/libs/janus.js
```

### Option 4: Use Browser to Download

1. Open browser
2. Navigate to: https://janus.conf.meetecho.com/janus.js (if available)
3. Save the file to: `app/public/libs/janus.js`

## Verification

Once downloaded, verify the file:

```bash
cd /Users/luizcarneiro/nexxau/app/public/libs
ls -lh janus.js
# Should be at least 100KB or more
head -20 janus.js
# Should show JavaScript code, not HTML error pages
```

The file should:
- Be a JavaScript file (not HTML error page)
- Contain `window.Janus` or similar Janus library code
- Be at least 100KB in size (unminified) or 50KB (minified)

## After Download

Once the file is in place:

1. Restart Next.js dev server
2. Clear browser cache
3. Test camera streaming
4. Check console for: `[JanusLoader] Using local Janus.js at /libs/janus.js`

