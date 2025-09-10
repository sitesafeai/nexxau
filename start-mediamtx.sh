#!/bin/bash

# Start MediaMTX with the updated configuration
echo "Starting MediaMTX with RTSP to HLS conversion..."

# Check if MediaMTX is installed
if ! command -v mediamtx &> /dev/null; then
    echo "MediaMTX is not installed. Please install it first:"
    echo "  macOS: brew install mediamtx"
    echo "  Linux: wget https://github.com/bluenviron/mediamtx/releases/latest/download/mediamtx_linux_amd64.tar.gz"
    echo "  Or download from: https://github.com/bluenviron/mediamtx/releases"
    exit 1
fi

# Start MediaMTX with the configuration file
mediamtx mediamtx.yml

echo "MediaMTX started!"
echo "RTSP stream will be available at: rtsp://localhost:8554/people"
echo "HLS stream will be available at: http://localhost:8888/people/index.m3u8"
echo "WebRTC stream will be available at: http://localhost:9002/people"
echo ""
echo "You can now use the HLS URL in your web application!"
