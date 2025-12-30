#!/bin/bash

# Start MediaMTX with clean configuration
# This script ensures MediaMTX is running with the correct config

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/mediamtx.yml"
LOG_FILE="/tmp/mediamtx.log"

# Check if MediaMTX is installed
if ! command -v mediamtx &> /dev/null; then
    echo "❌ MediaMTX is not installed."
    echo "Install it with:"
    echo "  macOS: brew install mediamtx"
    echo "  Linux: Download from https://github.com/bluenviron/mediamtx/releases"
    exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    exit 1
fi

# Kill existing MediaMTX processes
echo "🛑 Stopping existing MediaMTX processes..."
pkill -f "mediamtx.*mediamtx.yml" || true
sleep 1

# Start MediaMTX
echo "🚀 Starting MediaMTX..."
cd "$PROJECT_ROOT"
nohup mediamtx "$CONFIG_FILE" > "$LOG_FILE" 2>&1 &

# Wait a moment for it to start
sleep 2

# Check if it's running
if pgrep -f "mediamtx.*mediamtx.yml" > /dev/null; then
    echo "✅ MediaMTX started successfully!"
    echo "📋 Logs: $LOG_FILE"
    echo "🌐 HLS: http://localhost:8888"
    echo "🔌 API: http://localhost:9000"
else
    echo "❌ Failed to start MediaMTX. Check logs: $LOG_FILE"
    exit 1
fi

