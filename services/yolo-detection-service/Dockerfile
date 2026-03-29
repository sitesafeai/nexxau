FROM python:3.11-slim-bookworm

WORKDIR /app

# Minimal system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies - no cache to reduce size
RUN pip install --no-cache-dir \
    opencv-python-headless==4.9.0.80 \
    ultralytics==8.3.0 \
    numpy>=1.24.0 \
    requests>=2.31.0 \
    flask>=3.0.0 \
    twilio>=8.0.0

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV NEXXAU_API_URL=http://app:3000
ENV GO2RTC_RESTREAM_BASE=rtsp://go2rtc:8554
ENV DETECTION_FPS=3.0
ENV YOLO_MODEL=yolov8n.pt
ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["python", "src/main.py"]
