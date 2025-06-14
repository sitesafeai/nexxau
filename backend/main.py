from fastapi import FastAPI, UploadFile, File, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import io
from PIL import Image
import base64
import asyncio
import json
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS with more permissive settings for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model
model = YOLO('yolov8n.pt')  # Load the smallest YOLOv8 model

# Store active video streams
active_streams = {}

@app.post("/api/detect")
async def detect_objects(file: UploadFile = File(...)):
    # Read the image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Run inference
    results = model(img)
    
    # Process results
    detections = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls = int(box.cls[0].cpu().numpy())
            name = model.names[cls]
            
            detections.append({
                "class": name,
                "confidence": conf,
                "bbox": [float(x1), float(y1), float(x2), float(y2)]
            })
    
    # Draw detections on image
    for det in detections:
        x1, y1, x2, y2 = map(int, det["bbox"])
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(img, f"{det['class']} {det['confidence']:.2f}", 
                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    # Convert image to base64
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "detections": detections,
        "image": img_base64
    }

@app.websocket("/ws/video/{stream_id}")
async def video_stream(websocket: WebSocket, stream_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for stream {stream_id}")
    
    try:
        # Wait for the stream URL from the client
        stream_url = await websocket.receive_text()
        logger.info(f"Received stream URL: {stream_url}")
        
        # Initialize video capture
        if stream_url.startswith('rtsp://') or stream_url.startswith('http://'):
            cap = cv2.VideoCapture(stream_url)
        else:
            # Default to webcam if no valid URL provided
            cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            error_msg = "Failed to open video stream"
            logger.error(error_msg)
            await websocket.send_json({"error": error_msg})
            return
        
        active_streams[stream_id] = cap
        logger.info(f"Video capture initialized for stream {stream_id}")
        
        while True:
            try:
                ret, frame = cap.read()
                if not ret:
                    logger.error("Failed to read frame from video stream")
                    break
                
                # Run inference
                results = model(frame)
                
                # Process results
                detections = []
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0].cpu().numpy())
                        cls = int(box.cls[0].cpu().numpy())
                        name = model.names[cls]
                        
                        detections.append({
                            "class": name,
                            "confidence": conf,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)]
                        })
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        cv2.putText(frame, f"{name} {conf:.2f}", 
                                  (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # Convert frame to base64
                _, buffer = cv2.imencode('.jpg', frame)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                # Send frame and detections
                await websocket.send_json({
                    "frame": frame_base64,
                    "detections": detections
                })
                
                # Add small delay to control frame rate
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error processing frame: {str(e)}")
                await websocket.send_json({"error": f"Error processing frame: {str(e)}"})
                break
            
    except Exception as e:
        logger.error(f"Error in video stream: {str(e)}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        logger.info(f"Cleaning up stream {stream_id}")
        if stream_id in active_streams:
            active_streams[stream_id].release()
            del active_streams[stream_id]
        try:
            await websocket.close()
        except:
            pass

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")
    # Release all video captures
    for stream_id, cap in active_streams.items():
        logger.info(f"Releasing video capture for stream {stream_id}")
        cap.release()
    active_streams.clear()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 