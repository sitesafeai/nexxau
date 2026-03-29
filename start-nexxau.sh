#!/bin/bash

# ============================================================================
# Nexxau go2rtc System - Complete Startup Script
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting Nexxau go2rtc System"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop first."
    echo ""
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Step 1: Start streaming services (go2rtc + YOLO)
echo "📦 Starting streaming services..."
cd docker
docker-compose -f docker-compose.streaming.yml up -d --build

echo "⏳ Waiting for services to start..."
sleep 5

# Step 2: Health check go2rtc
echo ""
echo "🔍 Checking go2rtc..."
if curl -s http://localhost:1984/api/ >/dev/null; then
    echo "✅ go2rtc is running (http://localhost:1984)"
else
    echo "⚠️  go2rtc not responding yet"
fi

# Step 3: Health check YOLO service (retry up to 60s for model loading)
echo ""
echo "🔍 Checking YOLO detection service..."
for i in $(seq 1 12); do
  if curl -s http://localhost:5001/health >/dev/null 2>&1; then
    echo "✅ YOLO service is running (http://localhost:5001)"
    echo ""
    echo "Health status:"
    curl -s http://localhost:5001/health | jq . 2>/dev/null || curl -s http://localhost:5001/health
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "❌ YOLO service failed to start after 60s"
    echo "   Check logs: docker-compose -f docker/docker-compose.streaming.yml logs yolo-detection"
  else
    echo "⏳ Waiting for YOLO service... ($((i*5))s)"
    sleep 5
  fi
done

# Step 4: Next.js app
cd ../app
echo ""
echo "📱 Starting Next.js app..."
echo ""
echo "Run this in a separate terminal:"
echo "  cd /Users/luizcarneiro/nexxau/app"
echo "  npm run dev"
echo ""

# Step 5: Summary
echo "================================"
echo "🎉 Streaming services are running!"
echo ""
echo "Services:"
echo "  • go2rtc API:        http://localhost:1984"
echo "  • go2rtc Web UI:     http://localhost:1984"
echo "  • YOLO Health:       http://localhost:5001/health"
echo "  • Next.js:           http://localhost:3000 (start manually)"
echo ""
echo "Useful commands:"
echo "  • View logs:         docker-compose -f docker/docker-compose.streaming.yml logs -f"
echo "  • Stop services:     docker-compose -f docker/docker-compose.streaming.yml down"
echo "  • Restart:           docker-compose -f docker/docker-compose.streaming.yml restart"
echo "  • Check streams:     curl http://localhost:1984/api/config"
echo "  • Check YOLO health: curl http://localhost:5001/health | jq"
echo ""
CURRENT_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
if [ -n "$CURRENT_IP" ]; then
  echo "Host IP (for go2rtc ICE): $CURRENT_IP"
  echo "  If cameras are black after restart, ensure docker/go2rtc/go2rtc.yaml webrtc.candidates matches this IP, then: docker restart go2rtc"
  echo ""
fi
echo "Next steps:"
echo "  1. Start Next.js app in another terminal (cd app && npm run dev)"
echo "  2. Add a camera via the web UI"
echo "  3. Watch camera stream appear"
echo "  4. Check YOLO detections at http://localhost:5001/health"
echo ""
