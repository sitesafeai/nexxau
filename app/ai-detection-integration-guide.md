# 🤖 AI Detection Service Integration Guide

## 🔗 **Integration Overview**

Your AI detection service needs to send detection data to our system. Here's how to set it up:

### **1. API Endpoint**
```
POST http://localhost:3000/api/ai-detection
```

### **2. Data Format**
Your AI service should send data in this format:

```json
{
  "camera_id": "camera-1",
  "timestamp": "2025-01-07T23:30:00Z",
  "detections": [
    {
      "class": "person",
      "confidence": 0.95,
      "bbox": [100, 100, 200, 300],
      "id": "person-1"
    },
    {
      "class": "helmet",
      "confidence": 0.88,
      "bbox": [120, 80, 50, 50],
      "id": "helmet-1"
    }
  ],
  "metadata": {
    "location": "Construction Site A",
    "worksite_id": "worksite-1",
    "camera_name": "Main Entrance",
    "stream_quality": 95,
    "frame_rate": 30
  }
}
```

### **3. Python Integration Example**

```python
import requests
import json
from datetime import datetime

def send_detection_to_nexxau(camera_id, detections, metadata=None):
    """Send detection data to Nexxau system"""
    
    url = "http://localhost:3000/api/ai-detection"
    
    data = {
        "camera_id": camera_id,
        "timestamp": datetime.now().isoformat(),
        "detections": detections,
        "metadata": metadata or {}
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print("✅ Detection sent successfully")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error sending detection: {e}")
        return None

# Example usage
detections = [
    {
        "class": "person",
        "confidence": 0.95,
        "bbox": [100, 100, 200, 300],
        "id": "person-1"
    },
    {
        "class": "helmet",
        "confidence": 0.88,
        "bbox": [120, 80, 50, 50],
        "id": "helmet-1"
    }
]

metadata = {
    "location": "Construction Site A",
    "worksite_id": "worksite-1",
    "camera_name": "Main Entrance"
}

result = send_detection_to_nexxau("camera-1", detections, metadata)
```

### **4. Real-time Integration**

For real-time processing, you can integrate this into your YOLO detection loop:

```python
import cv2
from ultralytics import YOLO

def process_video_stream(camera_id, rtsp_url):
    """Process video stream and send detections"""
    
    model = YOLO('yolov8n.pt')  # Load your trained model
    cap = cv2.VideoCapture(rtsp_url)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Run detection
        results = model(frame)
        
        # Process results
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    detection = {
                        "class": model.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "bbox": box.xyxy[0].tolist(),
                        "id": f"{camera_id}-{len(detections)}"
                    }
                    detections.append(detection)
        
        # Send to Nexxau system
        if detections:
            send_detection_to_nexxau(camera_id, detections)
        
        # Control frame rate
        cv2.waitKey(30)  # ~30 FPS

# Start processing
process_video_stream("camera-1", "rtsp://your-camera-ip/stream")
```

### **5. WebSocket Integration (Optional)**

For even faster real-time processing:

```python
import asyncio
import websockets
import json

async def send_detection_websocket(detection_data):
    """Send detection via WebSocket"""
    
    uri = "ws://localhost:3000/api/websocket"
    
    async with websockets.connect(uri) as websocket:
        await websocket.send(json.dumps(detection_data))
        response = await websocket.recv()
        print(f"Response: {response}")

# Usage
detection_data = {
    "type": "detection",
    "camera_id": "camera-1",
    "detections": [...],
    "timestamp": datetime.now().isoformat()
}

asyncio.run(send_detection_websocket(detection_data))
```

## 🎯 **Next Steps**

1. **Update your AI service** to send data to our endpoint
2. **Test the integration** with sample detection data
3. **Create custom rules** for your specific use cases
4. **Configure SMS notifications** for managers
5. **Monitor the dashboard** for real-time alerts

## 🔧 **Troubleshooting**

- **Check API endpoint**: Ensure it's accessible from your AI service
- **Validate data format**: Use the exact JSON structure shown
- **Monitor logs**: Check the dashboard for processing errors
- **Test with sample data**: Use our test scripts to verify integration
