module.exports = {
  apps: [{
    name: 'nexxau-ai-detection',
    script: 'detection_manager.py',
    interpreter: 'python3',
    cwd: '/Users/luizcarneiro/nexxau/ai-detection',
    args: '--web-app-url http://localhost:3000 --model yolov8n.pt',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PYTHONUNBUFFERED: '1',
      WEB_APP_URL: 'http://localhost:3000'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};

