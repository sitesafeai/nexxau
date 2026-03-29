FROM python:3.11-slim-bookworm

WORKDIR /app

# Minimal deps for ultralytics-opencv-headless (no X11/GL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Set environment variables with defaults
ENV NEXXAU_API_URL=http://app:3000
ENV GO2RTC_RESTREAM_BASE=rtsp://go2rtc:8554
ENV DETECTION_FPS=3.0
ENV YOLO_MODEL=yolov8n.pt
ENV PYTHONUNBUFFERED=1

# Expose health endpoint port
EXPOSE 5000

# Run the service
CMD ["python", "src/main.py"]
