module.exports = {
  apps: [
    {
      name: 'nexxau-streaming',
      script: 'streaming/start-streaming.sh',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
