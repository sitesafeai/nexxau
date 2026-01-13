# WebRTC Adapter.js Requirement

## Overview

The Janus Gateway JavaScript client library (legacy version) **requires** the WebRTC adapter.js library to be loaded **before** Janus initializes.

## File Required

You must have the adapter.js file in this directory:

```
/public/libs/adapter.min.js
```

## Download Instructions

### Option 1: From CDN (Recommended for Quick Setup)

Download the UMD/global build from the official repository:

```bash
cd /Users/luizcarneiro/nexxau/app/public/libs
curl -O https://github.com/webrtcHacks/adapter/raw/main/release/adapter-latest.js
mv adapter-latest.js adapter.min.js
```

Or use a CDN link and download it:
- https://webrtc.github.io/adapter/adapter-latest.js

### Option 2: From npm Package

The `webrtc-adapter` package is already in package.json, but we need the browser build:

```bash
cd /Users/luizcarneiro/nexxau/app
npm install webrtc-adapter

# Copy the browser build
cp node_modules/webrtc-adapter/out/adapter.min.js public/libs/adapter.min.js
```

### Option 3: Build from Source

```bash
git clone https://github.com/webrtcHacks/adapter.git
cd adapter
npm install
npm run build
# Copy dist/adapter.min.js to public/libs/adapter.min.js
```

## Verification

After adding the file:

1. Start the Next.js dev server: `npm run dev`
2. The file should be accessible at: `http://localhost:3000/libs/adapter.min.js`
3. The JanusLoader will automatically load adapter.js before Janus.js
4. Check browser console - you should see: `[JanusLoader] ✅ Adapter.js loaded successfully`

## Important Notes

- The adapter must expose `window.adapter` (UMD/global build)
- The adapter must be loaded **before** Janus.js
- The JanusLoader handles this automatically - you just need to add the file
- If adapter.js is missing, you'll get: `adapter is not defined` error during Janus initialization

## File Size

Expected file size: ~10-20 KB (minified)

