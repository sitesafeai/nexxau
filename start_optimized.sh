#!/bin/bash

# Optimized Startup Script for Nexxau AI Detection System
# This script starts all services with proper database optimization and monitoring

set -e

echo "🚀 Starting Nexxau AI Detection System (Optimized)"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - $service_name not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

if ! command_exists ffmpeg; then
    echo -e "${YELLOW}⚠️  FFmpeg is not installed. RTSP-to-HLS conversion will not work.${NC}"
    echo -e "${YELLOW}   Install with: brew install ffmpeg${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Navigate to app directory
cd "$(dirname "$0")/app"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Generate Prisma client
echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Test database connection
echo -e "${BLUE}🗄️  Testing database connection...${NC}"
if npx prisma db push --accept-data-loss >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed. Please check your DATABASE_URL${NC}"
    exit 1
fi

# Start RTSP-to-HLS server
echo -e "${BLUE}📹 Starting RTSP-to-HLS conversion server...${NC}"
cd ../rtsp-server

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing RTSP server dependencies...${NC}"
    npm install
fi

# Start RTSP server in background
nohup node rtsp-server.js > ../rtsp-server.log 2>&1 &
RTSP_PID=$!
echo -e "${GREEN}✅ RTSP server started (PID: $RTSP_PID)${NC}"

# Wait for RTSP server to be ready
wait_for_service "http://localhost:8888/api/test" "RTSP Server"

# Start the people detection stream
echo -e "${BLUE}🎥 Starting people detection stream...${NC}"
curl -s -X POST "http://localhost:8888/api/streams/start" \
  -H "Content-Type: application/json" \
  -d '{
    "rtspUrl": "rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people",
    "streamName": "people"
  }' >/dev/null

echo -e "${GREEN}✅ People detection stream started${NC}"

# Start AI detection service
echo -e "${BLUE}🤖 Starting AI detection service...${NC}"
cd ../ai-detection

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    echo -e "${BLUE}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate

if [ ! -f "requirements.txt" ] || [ ! -d "venv/lib" ]; then
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    pip install ultralytics opencv-python requests numpy
fi

# Start AI detection in background
nohup python3 realtime_detector.py > ../ai-detection.log 2>&1 &
AI_PID=$!
echo -e "${GREEN}✅ AI detection service started (PID: $AI_PID)${NC}"

# Start Next.js application
echo -e "${BLUE}🌐 Starting Next.js application...${NC}"
cd ../app

# Start Next.js in background
nohup npm run dev > ../nextjs.log 2>&1 &
NEXTJS_PID=$!
echo -e "${GREEN}✅ Next.js application started (PID: $NEXTJS_PID)${NC}"

# Wait for Next.js to be ready
wait_for_service "http://localhost:3000" "Next.js Application"

# Test all services
echo -e "${BLUE}🧪 Testing all services...${NC}"

# Test RTSP server
if curl -s "http://localhost:8888/api/test" | grep -q "RTSP-HLS server is running"; then
    echo -e "${GREEN}✅ RTSP server is responding${NC}"
else
    echo -e "${RED}❌ RTSP server is not responding${NC}"
fi

# Test Next.js API
if curl -s "http://localhost:3000/api/cameras" | grep -q "success\|error"; then
    echo -e "${GREEN}✅ Next.js API is responding${NC}"
else
    echo -e "${RED}❌ Next.js API is not responding${NC}"
fi

# Test database analytics
if curl -s "http://localhost:3000/api/analytics/database?type=health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Database analytics is working${NC}"
else
    echo -e "${YELLOW}⚠️  Database analytics may not be working${NC}"
fi

# Save PIDs for cleanup
echo "$RTSP_PID" > ../rtsp.pid
echo "$AI_PID" > ../ai.pid
echo "$NEXTJS_PID" > ../nextjs.pid

# Display status
echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "   RTSP Server:     http://localhost:8888 (PID: $RTSP_PID)"
echo -e "   Next.js App:     http://localhost:3000 (PID: $NEXTJS_PID)"
echo -e "   AI Detection:    Running in background (PID: $AI_PID)"
echo ""
echo -e "${BLUE}🔗 Important URLs:${NC}"
echo -e "   Dashboard:       http://localhost:3000/dashboard"
echo -e "   Cameras:         http://localhost:3000/dashboard/cameras"
echo -e "   Analytics:       http://localhost:3000/dashboard/analytics"
echo -e "   People Stream:   http://localhost:8888/streams/people/index.m3u8"
echo ""
echo -e "${BLUE}📝 Log Files:${NC}"
echo -e "   RTSP Server:     ../rtsp-server.log"
echo -e "   AI Detection:    ../ai-detection.log"
echo -e "   Next.js:         ../nextjs.log"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   - Use 'tail -f ../ai-detection.log' to monitor AI detection"
echo -e "   - Use 'tail -f ../nextjs.log' to monitor Next.js"
echo -e "   - Use 'tail -f ../rtsp-server.log' to monitor RTSP server"
echo ""
echo -e "${GREEN}🚀 System is ready for AI-powered safety monitoring!${NC}"

# Keep script running to show status
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
trap 'echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"; kill $RTSP_PID $AI_PID $NEXTJS_PID 2>/dev/null; rm -f ../rtsp.pid ../ai.pid ../nextjs.pid; echo -e "${GREEN}✅ All services stopped${NC}"; exit 0' INT

# Monitor services
while true; do
    sleep 30
    
    # Check if services are still running
    if ! kill -0 $RTSP_PID 2>/dev/null; then
        echo -e "${RED}❌ RTSP server stopped unexpectedly${NC}"
    fi
    
    if ! kill -0 $AI_PID 2>/dev/null; then
        echo -e "${RED}❌ AI detection service stopped unexpectedly${NC}"
    fi
    
    if ! kill -0 $NEXTJS_PID 2>/dev/null; then
        echo -e "${RED}❌ Next.js application stopped unexpectedly${NC}"
    fi
done
