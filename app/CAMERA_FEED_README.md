# Camera Feed System

## Overview

The Nexxau dashboard now includes a robust camera feed system that can handle both live YOLOv8 streams and fallback demo videos. The system automatically detects when the YOLOv8 service is unavailable and switches to demo mode.

## Features

### 🎥 **Smart Camera Feed Component**
- **Automatic Fallback**: Switches from live stream to demo video when YOLOv8 service is unavailable
- **Real-time Status**: Shows connection status (Live Stream, Demo Video, Offline)
- **Interactive Controls**: Play/pause, fullscreen, retry connection
- **Loading States**: Smooth loading animations and error handling
- **Responsive Design**: Works on all screen sizes

### 🔄 **Auto-Recovery**
- Automatically attempts to reconnect to YOLOv8 stream
- Graceful degradation to demo video
- Manual retry button for connection issues

### 📊 **Status Indicators**
- **Green Dot**: Live stream active
- **Yellow Dot**: Connecting/loading
- **Red Dot**: Offline/error
- **Demo Mode**: Shows when using fallback video

## Usage

### Basic Camera Feed
```tsx
import CameraFeed from '../components/CameraFeed';

<CameraFeed 
  title="Main Construction Site Camera"
  streamUrl="http://localhost:5001/video_feed"
  fallbackVideo="/demo-third-aprty-sitesafe.mov"
  showControls={true}
  autoPlay={true}
/>
```

### Camera Grid (Multiple Cameras)
```tsx
import { CameraGrid } from '../components/CameraFeed';

const cameras = [
  {
    id: '1',
    name: 'Main Entrance',
    streamUrl: 'http://localhost:5001/video_feed',
    status: 'active'
  },
  {
    id: '2', 
    name: 'Construction Zone A',
    streamUrl: 'http://localhost:5002/video_feed',
    status: 'active'
  }
];

<CameraGrid cameras={cameras} columns={2} />
```

## Configuration

### Environment Variables
```bash
# Use mock data (development)
NEXT_PUBLIC_USE_MOCK_DATA=true

# Use real APIs (production)
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### YOLOv8 Service
The system expects a YOLOv8 service running on `http://localhost:5001/video_feed` that serves:
- **Format**: JPEG/MJPEG stream
- **Endpoint**: `/video_feed`
- **CORS**: Must allow cross-origin requests

### Demo Videos
Place demo videos in `app/public/`:
- `demo-third-aprty-sitesafe.mov` (main demo)
- `fast-machine-demo.mov` (alternative)
- `forklift-danger-preview.mov` (safety demo)

## Troubleshooting

### Camera Feed Shows "Stream error. Reconnecting..."
1. **Check YOLOv8 Service**: Ensure the service is running on port 5001
2. **Check CORS**: Verify the service allows cross-origin requests
3. **Check Network**: Ensure the service is accessible from the browser
4. **Fallback Mode**: The system will automatically switch to demo video

### Demo Video Not Playing
1. **Check File Path**: Ensure demo videos are in `app/public/`
2. **Check File Format**: Use MP4 format for best compatibility
3. **Check File Size**: Large files may take time to load

### Performance Issues
1. **Reduce Video Quality**: Use lower resolution demo videos
2. **Enable Compression**: Compress demo videos for faster loading
3. **Use CDN**: Host videos on a CDN for better performance

## Development

### Adding New Camera Feeds
1. Add camera data to the API service
2. Update the dashboard to use the new camera
3. Test with both live stream and fallback modes

### Customizing the Component
```tsx
// Custom styling
<CameraFeed 
  className="custom-camera-feed"
  title="Custom Camera"
  showControls={false}
  autoPlay={false}
/>

// Custom fallback video
<CameraFeed 
  fallbackVideo="/custom-demo.mp4"
  streamUrl="http://custom-server:8080/stream"
/>
```

## Production Deployment

### YOLOv8 Service Setup
1. Deploy YOLOv8 service to production server
2. Update stream URLs in configuration
3. Ensure proper CORS headers
4. Set up monitoring and health checks

### Demo Videos
1. Host demo videos on CDN
2. Update fallback video URLs
3. Optimize video files for web delivery
4. Set up proper caching headers

## API Integration

The camera feed system integrates with the existing API layer:

```tsx
// Fetch cameras for a site
const { data: cameras, loading, error } = useCameras(siteId);

// Use cameras in grid
<CameraGrid cameras={cameras} columns={2} />
```

## Security Considerations

- **CORS**: Ensure YOLOv8 service allows only trusted origins
- **Authentication**: Implement proper authentication for camera streams
- **HTTPS**: Use HTTPS in production for secure video streams
- **Access Control**: Implement role-based access to camera feeds

## Monitoring

The system provides real-time status information:
- Connection status
- Stream quality
- Error rates
- Performance metrics

Use the notification system to alert users of camera issues:

```tsx
addNotification({
  type: 'warning',
  title: 'Camera Offline',
  message: 'Main entrance camera is currently unavailable'
});
``` 