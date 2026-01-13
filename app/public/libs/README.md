# Janus.js Library - Local Hosting

This directory contains the Janus.js client library for WebRTC streaming.

## File: janus.js

**Status:** ⚠️ **NEEDS TO BE DOWNLOADED**

The `janus.js` file needs to be manually downloaded and placed in this directory.

## Download Instructions

### Option 1: From npm (Recommended)

```bash
cd /Users/luizcarneiro/nexxau/app
npm install janus-gateway

# Copy the file
cp node_modules/janus-gateway/janus.js public/libs/janus.js
```

### Option 2: Manual Download

1. Visit the Janus Gateway repository: https://github.com/meetecho/janus-gateway
2. Navigate to the demo files (typically in `html/` directory)
3. Download `janus.js` or `janus.min.js`
4. Place it in this directory as `janus.js`

### Option 3: Build from Source

If the JavaScript client needs to be built:

```bash
git clone https://github.com/meetecho/janus-gateway.git
cd janus-gateway
# Follow build instructions in repository
# Copy built janus.js to this directory
```

## Verification

Once the file is in place, verify it works:

1. Start the Next.js dev server: `npm run dev`
2. The file should be accessible at: `http://localhost:3000/libs/janus.js`
3. Open browser console and check for: `[JanusLoader] Using local Janus.js at /libs/janus.js`
4. The file should define `window.Janus` when loaded

## File Size

Expected file size: ~200-500 KB (unminified) or ~100-200 KB (minified)

## Notes

- The file is served statically by Next.js from the `/public` directory
- The path `/libs/janus.js` maps to `public/libs/janus.js`
- The JanusLoader service automatically loads this file when needed
- No CDN dependency - all loading is local and reliable
