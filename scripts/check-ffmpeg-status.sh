#!/bin/bash

# Check FFmpeg processes and RTP stream status

echo "=== FFmpeg Process Check ==="
echo ""
echo "Active FFmpeg processes:"
ps aux | grep ffmpeg | grep -v grep | head -10

echo ""
echo "=== Camera Ingest Service Status ==="
curl -s http://localhost:3001/health | jq '.' 2>/dev/null || echo "Service not responding"

echo ""
echo "=== Active RTP Streams ==="
curl -s http://localhost:3001/api/v1/rtp/streams | jq '.data[] | {cameraId, status, rtpPort, rtpHost}' 2>/dev/null || echo "Failed to fetch streams"

echo ""
echo "=== Check if FFmpeg is sending RTP packets ==="
echo "Run this to see RTP traffic on a specific port (replace PORT with actual port):"
echo "  sudo tcpdump -i lo port PORT -n -c 10"
