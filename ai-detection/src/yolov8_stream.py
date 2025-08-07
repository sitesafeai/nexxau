from flask import Flask, Response
from flask_cors import CORS
import cv2
from ultralytics import YOLO

# Replace with your RTSP stream or video file
VIDEO_SOURCE = 'rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people'

app = Flask(__name__)
CORS(app)
model = YOLO('yolov8n.pt')  # Downloads model if not present

def gen_frames():
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    while True:
        success, frame = cap.read()
        if not success:
            break
        # Run YOLOv8 detection
        results = model(frame)
        annotated_frame = results[0].plot()  # Draw boxes/labels

        # Encode as JPEG
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 