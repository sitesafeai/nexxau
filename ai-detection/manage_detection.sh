#!/bin/bash

# Detection Service Management Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "$1" in
  start)
    echo "🚀 Starting detection service..."
    if pgrep -f "detection_manager.py" > /dev/null; then
      echo "⚠️  Service is already running (PID: $(pgrep -f 'detection_manager.py'))"
    else
      nohup python3 detection_manager.py --web-app-url http://localhost:3000 --model yolov8n.pt > logs/detection.log 2>&1 &
      sleep 3
      if pgrep -f "detection_manager.py" > /dev/null; then
        echo "✅ Service started successfully (PID: $(pgrep -f 'detection_manager.py'))"
      else
        echo "❌ Failed to start service. Check logs: logs/detection.log"
      fi
    fi
    ;;
    
  stop)
    echo "🛑 Stopping detection service..."
    if pgrep -f "detection_manager.py" > /dev/null; then
      pkill -f "detection_manager.py"
      sleep 2
      if ! pgrep -f "detection_manager.py" > /dev/null; then
        echo "✅ Service stopped successfully"
      else
        echo "⚠️  Some processes may still be running"
      fi
    else
      echo "ℹ️  Service is not running"
    fi
    ;;
    
  restart)
    echo "🔄 Restarting detection service..."
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    if pgrep -f "detection_manager.py" > /dev/null; then
      PID=$(pgrep -f "detection_manager.py")
      echo "✅ Service is running (PID: $PID)"
      echo ""
      echo "📊 Process info:"
      ps -p $PID -o pid,pcpu,pmem,etime,command
      echo ""
      echo "📝 Recent logs (last 10 lines):"
      tail -10 logs/detection.log 2>/dev/null || echo "   No logs yet"
    else
      echo "❌ Service is not running"
    fi
    ;;
    
  logs)
    echo "📝 Detection service logs (Ctrl+C to exit):"
    tail -f logs/detection.log 2>/dev/null || echo "No log file found"
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the detection service"
    echo "  stop    - Stop the detection service"
    echo "  restart - Restart the detection service"
    echo "  status  - Show service status and info"
    echo "  logs    - Follow detection service logs"
    exit 1
    ;;
esac

