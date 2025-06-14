#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    python3-pip \
    python3-dev \
    nginx \
    ffmpeg \
    nodejs \
    npm \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-venv

# Install NVIDIA drivers if GPU is present
if lspci | grep -i nvidia; then
    sudo apt install -y nvidia-driver-525
fi

# Create project directory
mkdir -p /opt/sitesafe
cd /opt/sitesafe

# Clone repositories
git clone https://github.com/your-repo/video-streaming-server.git
git clone https://github.com/your-repo/ai-detection.git

# Setup Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r ai-detection/requirements.txt

# Install Node.js dependencies
cd video-streaming-server
npm install

# Create systemd service for video streaming
sudo tee /etc/systemd/system/sitesafe-streaming.service << EOF
[Unit]
Description=SiteSafe Video Streaming Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/sitesafe/video-streaming-server
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for AI detection
sudo tee /etc/systemd/system/sitesafe-ai.service << EOF
[Unit]
Description=SiteSafe AI Detection Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/sitesafe/ai-detection
ExecStart=/opt/sitesafe/venv/bin/python main.py
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable sitesafe-streaming
sudo systemctl enable sitesafe-ai
sudo systemctl start sitesafe-streaming
sudo systemctl start sitesafe-ai

# Configure Nginx for video streaming
sudo tee /etc/nginx/sites-available/sitesafe << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /hls {
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        root /opt/sitesafe/video-streaming-server/media;
        add_header Cache-Control no-cache;
        add_header Access-Control-Allow-Origin *;
    }
}
EOF

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/sitesafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "Server setup complete!" 