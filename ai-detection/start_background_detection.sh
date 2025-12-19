#!/bin/bash

# Background Detection Service Startup Script
# This script starts the AI detection service in the background

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Nexxau Background Detection Service..."
echo ""

# Check if Python dependencies are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import cv2, ultralytics, requests" 2>/dev/null; then
    echo "❌ Missing dependencies. Installing..."
    pip3 install opencv-python ultralytics requests > /dev/null 2>&1
    echo "✅ Dependencies installed"
fi

# Check if YOLO model exists
if [ ! -f "yolov8n.pt" ]; then
    echo "📥 Downloading YOLO model..."
    python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>/dev/null || echo "⚠️  Model download may take a moment..."
fi

# Set web app URL (default to localhost:3000, can be overridden)
WEB_APP_URL="${WEB_APP_URL:-http://localhost:3000}"
MODEL_PATH="${MODEL_PATH:-yolov8n.pt}"

echo "🌐 Web App URL: $WEB_APP_URL"
echo "🤖 Model: $MODEL_PATH"
echo ""

# Check if already running
if pgrep -f "detection_manager.py" > /dev/null; then
    echo "⚠️  Detection service is already running!"
    echo "   PID: $(pgrep -f 'detection_manager.py')"
    echo ""
    read -p "Do you want to restart it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 Stopping existing service..."
        pkill -f "detection_manager.py"
        sleep 2
    else
        echo "✅ Using existing service"
        exit 0
    fi
fi

# Create logs directory
mkdir -p logs

# Start the detection manager
echo "▶️  Starting detection manager..."
nohup python3 detection_manager.py \
    --web-app-url "$WEB_APP_URL" \
    --model "$MODEL_PATH" \
    > logs/detection.log 2>&1 &

DETECTION_PID=$!
sleep 3

# Check if it started successfully
if ps -p $DETECTION_PID > /dev/null; then
    echo "✅ Detection service started successfully!"
    echo "   PID: $DETECTION_PID"
    echo "   Logs: $SCRIPT_DIR/logs/detection.log"
    echo ""
    echo "📊 To check status:"
    echo "   tail -f $SCRIPT_DIR/logs/detection.log"
    echo ""
    echo "🛑 To stop:"
    echo "   pkill -f detection_manager.py"
    echo ""
    echo "📋 To view running processes:"
    echo "   ps aux | grep detection_manager"
else
    echo "❌ Failed to start detection service"
    echo "   Check logs: $SCRIPT_DIR/logs/detection.log"
    exit 1
fi

