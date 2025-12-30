# Detection Service Dockerfile (CPU base)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies (CPU-only PyTorch)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Create models directory
RUN mkdir -p /models

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app /models

USER appuser

# Expose ports
EXPOSE 8080 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

# Default command
CMD ["python", "src/main.py"]

# Note: For GPU support, use a CUDA base image and install CUDA-enabled PyTorch:
# FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04
# Then install: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
