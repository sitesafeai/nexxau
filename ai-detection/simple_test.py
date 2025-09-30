#!/usr/bin/env python3
"""
Simple test script to verify YOLO detection is working
"""

import cv2
import numpy as np
from ultralytics import YOLO
import time

def test_yolo_detection():
    """Test YOLO detection with a simple image or video stream."""
    
    print("🎯 Testing YOLO detection...")
    
    # Load YOLO model
    try:
        model = YOLO('yolov8n.pt')
        print("✅ YOLO model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load YOLO model: {e}")
        return False
    
    # Test with RTSP stream
    rtsp_url = "rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people"
    print(f"📹 Testing with RTSP stream: {rtsp_url}")
    
    try:
        # Open video stream
        cap = cv2.VideoCapture(rtsp_url)
        
        if not cap.isOpened():
            print("❌ Failed to open RTSP stream")
            return False
        
        print("✅ RTSP stream opened successfully")
        
        # Set buffer size for lower latency
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        frame_count = 0
        detection_count = 0
        
        print("🔍 Starting detection loop... (Press Ctrl+C to stop)")
        
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print("⚠️ Failed to read frame")
                time.sleep(0.1)
                continue
            
            frame_count += 1
            
            # Process every 30th frame to reduce load
            if frame_count % 30 == 0:
                print(f"📊 Processing frame {frame_count}...")
                
                # Run YOLO detection
                results = model(frame, verbose=False)
                
                detections = []
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for i in range(len(boxes)):
                            x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                            confidence = boxes.conf[i].cpu().numpy()
                            class_id = int(boxes.cls[i].cpu().numpy())
                            
                            # Only high confidence detections
                            if confidence > 0.5:
                                detection_count += 1
                                print(f"🎯 Detection {detection_count}: Class {class_id}, Confidence: {confidence:.2f}")
                                
                                # Draw bounding box
                                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                                cv2.putText(frame, f"Class {class_id}: {confidence:.2f}", 
                                          (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                if detections:
                    print(f"✅ Found {len(detections)} objects in frame {frame_count}")
                else:
                    print(f"ℹ️ No objects detected in frame {frame_count}")
                
                # Show frame (optional - comment out if running headless)
                # cv2.imshow('YOLO Detection Test', frame)
                # if cv2.waitKey(1) & 0xFF == ord('q'):
                #     break
            
            # Small delay
            time.sleep(0.033)  # ~30 FPS
            
            # Stop after 100 frames for testing
            if frame_count >= 100:
                print(f"🏁 Test completed after {frame_count} frames")
                break
                
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"❌ Error during detection test: {e}")
        return False
    finally:
        if 'cap' in locals():
            cap.release()
        cv2.destroyAllWindows()
    
    print(f"✅ Test completed successfully!")
    print(f"📊 Processed {frame_count} frames")
    print(f"🎯 Total detections: {detection_count}")
    
    return True

if __name__ == "__main__":
    success = test_yolo_detection()
    if success:
        print("🎉 YOLO detection test PASSED!")
    else:
        print("💥 YOLO detection test FAILED!")
