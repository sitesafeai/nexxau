# 🤖 AI Integration Setup Guide

## 🚀 **Quick Start (5 Minutes)**

### **Step 1: Setup AI Detection Environment**
```bash
cd /Users/luizcarneiro/nexxau/ai-detection
./setup_integration.sh
```

### **Step 2: Configure Your Camera**
Edit `yolo_integration.py` and update the configuration:

```python
config = {
    "model_path": "yolov8n.pt",  # Your YOLO model
    "nexxau_url": "http://localhost:3000",
    "camera_id": "camera-1",  # Unique camera ID
    "confidence_threshold": 0.5,
    "video_source": 0,  # 0 for webcam, or "rtsp://192.168.1.100/stream"
    "metadata": {
        "location": "Construction Site A",
        "worksite_id": "worksite-1",
        "camera_name": "Main Entrance Camera"
    }
}
```

### **Step 3: Start Nexxau Backend**
```bash
cd /Users/luizcarneiro/nexxau/app
npm run dev
```

### **Step 4: Run AI Integration**
```bash
cd /Users/luizcarneiro/nexxau/ai-detection
source nexxau_ai_env/bin/activate
python yolo_integration.py
```

## 🎯 **Step 2: Create Your First Custom Rule**

### **Access the Dashboard**
1. Go to: `http://localhost:3000/dashboard/custom-rules`
2. Click "Create Rule"

### **Example: Hard Hat Violation Rule**
```json
{
  "name": "Hard Hat Violation Detection",
  "description": "Detects when workers are not wearing hard hats",
  "ruleType": "object_detection",
  "category": "safety",
  "severity": "high",
  "detectionCriteria": {
    "requiredObjects": ["person"]
  },
  "triggerConditions": {
    "type": "object_missing",
    "requiredObject": "helmet"
  },
  "confidenceThreshold": 0.8,
  "smsEnabled": true,
  "smsRecipients": ["+1234567890"]
}
```

## 📱 **Step 3: Configure SMS Notifications**

### **Add Manager Phone Numbers**
1. Go to: `http://localhost:3000/dashboard/sms-notifications`
2. Add emergency contacts
3. Configure SMS recipients for each rule

### **Test SMS System**
```bash
cd /Users/luizcarneiro/nexxau/app
node test-sms-send.js
```

## 🧪 **Step 4: Test with Real Camera Feeds**

### **Test with Webcam**
```python
# In yolo_integration.py, set:
"video_source": 0  # Webcam
```

### **Test with RTSP Stream**
```python
# In yolo_integration.py, set:
"video_source": "rtsp://192.168.1.100/stream"
```

### **Test with Video File**
```python
# In yolo_integration.py, set:
"video_source": "/path/to/video.mp4"
```

## 🚀 **Step 5: Deploy to Production**

### **Environment Setup**
```bash
# Production environment variables
export NODE_ENV=production
export DATABASE_URL="your-production-db-url"
export TWILIO_ACCOUNT_SID="your-twilio-sid"
export TWILIO_AUTH_TOKEN="your-twilio-token"
```

### **Deploy Backend**
```bash
cd /Users/luizcarneiro/nexxau/app
npm run build
npm start
```

### **Deploy AI Service**
```bash
cd /Users/luizcarneiro/nexxau/ai-detection
# Run as service or in Docker
python yolo_integration.py
```

## 🔧 **Advanced Configuration**

### **Custom YOLO Model**
```python
# Train your own model for specific PPE detection
from ultralytics import YOLO

# Load and train model
model = YOLO('yolov8n.pt')
model.train(data='ppe_dataset.yaml', epochs=100)
```

### **Multiple Cameras**
```python
# Run multiple camera integrations
cameras = [
    {"id": "camera-1", "source": "rtsp://192.168.1.100/stream1"},
    {"id": "camera-2", "source": "rtsp://192.168.1.101/stream1"},
    {"id": "camera-3", "source": 0}  # Webcam
]

for camera in cameras:
    integration = NexxauYOLOIntegration(
        camera_id=camera["id"],
        video_source=camera["source"]
    )
    # Run in separate process
```

### **Edge Deployment (NVIDIA Jetson)**
```bash
# Install on Jetson
sudo apt update
sudo apt install python3-pip
pip3 install -r requirements.txt

# Run with optimized settings
python yolo_integration.py --optimize
```

## 📊 **Monitoring & Troubleshooting**

### **Check Integration Status**
```bash
# Check if AI service is sending data
curl http://localhost:3000/api/ai-detection

# Check custom rules
curl http://localhost:3000/api/custom-rules
```

### **View Logs**
```bash
# Backend logs
cd /Users/luizcarneiro/nexxau/app
npm run dev  # Check console output

# AI service logs
cd /Users/luizcarneiro/nexxau/ai-detection
python yolo_integration.py  # Check console output
```

### **Common Issues**

1. **Connection Error**: Check if Nexxau backend is running
2. **No Detections**: Verify camera source and model path
3. **SMS Not Sent**: Check Twilio credentials and phone numbers
4. **Rules Not Triggering**: Verify confidence thresholds and rule configuration

## 🎉 **Success!**

Once everything is working:
- ✅ AI service sends detections to Nexxau
- ✅ Custom rules evaluate detections
- ✅ SMS alerts sent to managers
- ✅ Dashboard shows real-time monitoring
- ✅ System is production-ready

**Your SiteSafe system is now fully operational!** 🚀
