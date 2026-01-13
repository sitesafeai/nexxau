# Janus WebRTC Camera Player

Production-ready Janus WebRTC streaming component for Nexxau dashboard.

## Component

```tsx
import JanusCameraPlayer from '@/app/components/video/JanusCameraPlayer';

<JanusCameraPlayer cameraId="camera-123" />
```

## Backend API Requirement

The component expects a backend API endpoint that returns Janus streaming metadata:

**Endpoint:** `GET /api/cameras/{cameraId}/stream`

**Response:**
```json
{
  "janusServerUrl": "wss://janus.example.com/janus",
  "mountpointId": 123,
  "cameraId": "camera-123"
}
```

**Fields:**
- `janusServerUrl` (string, required): WebSocket URL to Janus Gateway server
- `mountpointId` (number, required): Janus Streaming Plugin mountpoint ID
- `cameraId` (string, required): Camera identifier

## Architecture

- **JanusCameraPlayer.tsx**: React component (view layer)
- **useJanusStream.ts**: React hook (state management)
- **janusClient.ts**: Janus client service (WebRTC logic)

## Features

- ✅ Fetches metadata from backend
- ✅ Manages Janus session lifecycle
- ✅ Handles WebRTC negotiation
- ✅ Cleanup on unmount
- ✅ Error handling and retries
- ✅ State management (loading, live, offline, error)
- ✅ No hardcoded values
- ✅ Production-grade error handling

## WebRTC Flow

1. Initialize Janus library
2. Create Janus session
3. Attach to streaming plugin (`janus.plugin.streaming`)
4. Send `watch` request with `mountpointId`
5. Handle SDP offer from Janus
6. Create WebRTC answer (recvonly)
7. Send answer to Janus
8. Send `start` request
9. Receive remote MediaStream
10. Attach stream to video element

## Cleanup

All resources are cleaned up on component unmount:
- MediaStream tracks stopped
- RTCPeerConnection closed
- Plugin handle detached
- Janus session destroyed

No memory leaks.
