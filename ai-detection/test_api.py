#!/usr/bin/env python3
"""
Test script to manually send detection results to the API
"""

import requests
import json
from datetime import datetime

def test_detection_api():
    """Test sending detection results to the API."""
    
    # Sample detection data
    detection_data = {
        'camera_id': 'cmfergh960003p925blttc4ag',  # People Detection Camera 13
        'timestamp': datetime.now().isoformat(),
        'detections': [
            {
                'class_id': 0,
                'class_name': 'person',
                'confidence': 0.85,
                'bbox': {
                    'x1': 100,
                    'y1': 100,
                    'x2': 200,
                    'y2': 300
                },
                'timestamp': datetime.now().isoformat()
            },
            {
                'class_id': 0,
                'class_name': 'person',
                'confidence': 0.78,
                'bbox': {
                    'x1': 300,
                    'y1': 150,
                    'x2': 400,
                    'y2': 350
                },
                'timestamp': datetime.now().isoformat()
            }
        ],
        'frame_data': 'test_frame_data',  # Simplified for testing
        'frame_width': 640,
        'frame_height': 480
    }
    
    try:
        print("🧪 Testing detection API...")
        print(f"📤 Sending detection data: {len(detection_data['detections'])} objects")
        
        response = requests.post(
            'http://localhost:3000/api/yolo/detections',
            json=detection_data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Response: {result}")
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_get_detections():
    """Test getting detection results from the API."""
    
    try:
        print("\n🔍 Testing get detections API...")
        
        response = requests.get(
            'http://localhost:3000/api/yolo/detections',
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Detections: {result['count']} found")
            if result['detections']:
                print(f"📊 Latest detection: {result['detections'][0]}")
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_detection_api()
    test_get_detections()
