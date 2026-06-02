FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pin numpy BEFORE torch to prevent ABI mismatch (torch bundles its own numpy
# C extensions; reinstalling numpy afterwards breaks isinstance checks in ultralytics)
RUN pip install --no-cache-dir numpy==1.26.3

# Install CPU-only PyTorch first (saves ~2GB vs default CUDA build)
RUN pip install --no-cache-dir \
    torch==2.0.1+cpu \
    torchvision==0.15.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

CMD ["python", "railway_service.py"]
