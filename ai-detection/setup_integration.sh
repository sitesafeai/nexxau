#!/bin/bash

# YOLO Integration Setup Script
echo "🤖 Setting up YOLO Integration with Nexxau Safety System..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv nexxau_ai_env
source nexxau_ai_env/bin/activate

# Install requirements
echo "📥 Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# Download YOLO model (if not exists)
echo "📥 Downloading YOLO model..."
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Test installation
echo "🧪 Testing installation..."
python -c "
import cv2
import requests
from ultralytics import YOLO
print('✅ All packages installed successfully!')
print('✅ OpenCV version:', cv2.__version__)
print('✅ YOLO model loaded successfully!')
"

echo "🎉 YOLO Integration setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Configure your camera source in yolo_integration.py"
echo "2. Start the Nexxau backend: cd ../app && npm run dev"
echo "3. Run the integration: python yolo_integration.py"
echo ""
echo "📖 For more information, see the integration guide in the app directory"
