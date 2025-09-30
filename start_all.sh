#!/bin/bash
# Nexxau AI Detection - Complete Startup Script

echo "🚀 Starting Nexxau AI Detection System..."
echo "=========================================="

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Function to start service in background
start_service() {
    local name=$1
    local command=$2
    local port=$3
    
    echo "🔄 Starting $name..."
    if check_port $port; then
        eval "$command" &
        local pid=$!
        echo "✅ $name started (PID: $pid) on port $port"
        echo $pid > "${name,,}.pid"
    else
        echo "❌ Failed to start $name - port $port is busy"
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    
    if [ -f "web.pid" ]; then
        kill $(cat web.pid) 2>/dev/null
        rm web.pid
        echo "✅ Web app stopped"
    fi
    
    if [ -f "rtsp.pid" ]; then
        kill $(cat rtsp.pid) 2>/dev/null
        rm rtsp.pid
        echo "✅ RTSP server stopped"
    fi
    
    if [ -f "yolo.pid" ]; then
        kill $(cat yolo.pid) 2>/dev/null
        rm yolo.pid
        echo "✅ YOLO detection stopped"
    fi
    
    echo "👋 All services stopped. Goodbye!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "📋 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg is not installed. RTSP conversion may not work."
fi

echo "✅ Prerequisites check completed"
echo ""

# Start Web Application
start_service "Web App" "cd app && npm run dev" 3000
sleep 3

# Start RTSP Server
start_service "RTSP Server" "cd rtsp-server && node rtsp-server.js" 8888
sleep 2

# Start Real-time YOLO Detection
start_service "Real-time YOLO Detection" "cd ai-detection && python3 realtime_detector.py" 0
sleep 2

echo ""
echo "🎉 All services started successfully!"
echo "=========================================="
echo "🌐 Web Application: http://localhost:3000"
echo "🎥 RTSP Server: http://localhost:8888"
echo "🤖 YOLO Detection: Running in background"
echo ""
echo "📊 Test URLs:"
echo "   • Cameras API: http://localhost:3000/api/cameras"
echo "   • RTSP Status: http://localhost:8888/api/test"
echo "   • HLS Stream: http://localhost:8888/streams/people/index.m3u8"
echo "   • Detections: http://localhost:3000/api/yolo/detections"
echo ""
echo "🎯 Live Streams Available:"
echo "   • People Detection: rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people"
echo "   • Apple Test: https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
while true; do
    sleep 1
done
