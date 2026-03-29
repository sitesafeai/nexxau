#!/bin/bash
# Helper script to run the detection service with the correct virtual environment

cd "$(dirname "$0")/.." || exit 1

# Activate virtual environment
if [ -d "yolov8-env" ]; then
    source yolov8-env/bin/activate
else
    echo "Error: yolov8-env virtual environment not found!"
    echo "Please create it first: python3 -m venv yolov8-env"
    exit 1
fi

# Check if dependencies are installed
if ! python -c "import httpx" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r ai-detection/requirements.txt
fi

# Run the service
echo "Starting detection service on port 8766..."
python ai-detection/detection_service.py

