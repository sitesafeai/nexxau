#!/bin/bash

# Startup script for go2rtc + YOLO Detection Service
# Quick start for simplified streaming architecture

set -e

echo "=================================================="
echo "Starting Simplified Streaming Architecture"
echo "=================================================="
echo ""

# Check if running from correct directory
if [ ! -f "docker-compose.streaming.yml" ]; then
    echo "❌ Error: Must run from docker/ directory"
    echo "   cd /Users/luizcarneiro/nexxau/docker"
    exit 1
fi

# Check for required environment variables
if [ -z "$INTERNAL_SERVICE_TOKEN" ]; then
    echo "⚠️  Warning: INTERNAL_SERVICE_TOKEN not set"
    echo "   YOLO service will not be able to fetch cameras from Nexxau"
    echo "   Set in docker-compose.streaming.yml or export before running"
fi

echo "📦 Building YOLO detection service..."
docker-compose -f docker-compose.streaming.yml build yolo-detection

echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose.streaming.yml up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ Services started!"
echo ""
echo "=================================================="
echo "Service URLs:"
echo "=================================================="
echo "go2rtc Web UI:        http://localhost:1984"
echo "go2rtc API:           http://localhost:1984/api/"
echo "go2rtc RTSP Server:   rtsp://localhost:8554/{stream_id}"
echo "YOLO Health:          http://localhost:5001/health"
echo ""
echo "=================================================="
echo "Quick Commands:"
echo "=================================================="
echo "# View logs"
echo "docker-compose -f docker-compose.streaming.yml logs -f"
echo ""
echo "# Check health"
echo "curl http://localhost:5001/health"
echo ""
echo "# Stop services"
echo "docker-compose -f docker-compose.streaming.yml down"
echo ""
echo "=================================================="
echo "Next Steps:"
echo "=================================================="
echo "1. Add cameras to go2rtc via Nexxau UI"
echo "2. YOLO service will auto-detect and process streams"
echo "3. Monitor health: http://localhost:5001/health"
echo "4. View go2rtc streams: http://localhost:1984"
echo ""
