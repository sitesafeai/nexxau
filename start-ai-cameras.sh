#!/bin/bash

echo "🚀 Starting SiteSafe AI Camera System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MediaMTX is running
echo -e "${BLUE}📹 Checking MediaMTX streaming server...${NC}"
if lsof -Pi :8889 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ MediaMTX is already running on port 8889${NC}"
else
    echo -e "${YELLOW}⚙️  Starting MediaMTX...${NC}"
    mediamtx > /tmp/mediamtx.log 2>&1 &
    sleep 2
    if lsof -Pi :8889 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✅ MediaMTX started successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  MediaMTX failed to start, but cameras may still work with fallback${NC}"
    fi
fi

echo ""

# Check if AI Detection is running
echo -e "${BLUE}🤖 Checking AI Detection Service...${NC}"
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ AI Detection is already running on port 5001${NC}"
else
    echo -e "${YELLOW}⚙️  Starting AI Detection Service...${NC}"
    cd /Users/luizcarneiro/nexxau/ai-detection
    
    # Check if Python packages are installed
    if python3 -c "import cv2, ultralytics" 2>/dev/null; then
        python3 realtime_detector.py > /tmp/ai-detection.log 2>&1 &
        sleep 3
        if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo -e "${GREEN}✅ AI Detection started successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  AI Detection service starting... (check /tmp/ai-detection.log for details)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Python packages not installed. Installing...${NC}"
        pip3 install opencv-python ultralytics requests > /dev/null 2>&1
        echo -e "${GREEN}✅ Packages installed. Starting AI Detection...${NC}"
        python3 realtime_detector.py > /tmp/ai-detection.log 2>&1 &
        sleep 3
    fi
fi

echo ""
echo -e "${BLUE}📊 System Status:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🌐 Web Dashboard:${NC} http://localhost:3000/dashboard"
echo -e "${GREEN}📹 Camera Streams:${NC} http://localhost:8889"
echo -e "${GREEN}🤖 AI Detection:${NC} Port 5001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo "  MediaMTX: /tmp/mediamtx.log"
echo "  AI Detection: /tmp/ai-detection.log"
echo ""
echo -e "${GREEN}✨ SiteSafe AI Camera System is ready!${NC}"
echo ""

