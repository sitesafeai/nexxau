#!/bin/bash

# Nexxau Monitoring Setup Script
echo "🚀 Setting up Nexxau Monitoring Stack..."

# Create necessary directories
mkdir -p logs
mkdir -p prometheus/data
mkdir -p grafana/data
mkdir -p alertmanager/data
mkdir -p elasticsearch/data
mkdir -p redis/data

# Set proper permissions
chmod 755 logs
chmod 755 prometheus/data
chmod 755 grafana/data
chmod 755 alertmanager/data
chmod 755 elasticsearch/data
chmod 755 redis/data

# Create logstash configuration
mkdir -p logstash
cat > logstash/logstash.conf << EOF
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "nexxau" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level}: %{GREEDYDATA:message}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "nexxau-logs-%{+YYYY.MM.dd}"
  }
}
EOF

# Create Grafana datasource configuration
mkdir -p grafana/datasources
cat > grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Create Grafana dashboard provisioning
mkdir -p grafana/dashboards
cat > grafana/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'nexxau-dashboards'
    orgId: 1
    folder: 'Nexxau'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

# Start monitoring stack
echo "📊 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus is healthy"
else
    echo "❌ Prometheus is not responding"
fi

# Check Grafana
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is not responding"
fi

# Check Elasticsearch
if curl -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "✅ Elasticsearch is healthy"
else
    echo "❌ Elasticsearch is not responding"
fi

# Check Redis
if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis is not responding"
fi

echo ""
echo "🎉 Monitoring stack setup complete!"
echo ""
echo "📊 Access your monitoring tools:"
echo "  • Grafana: http://localhost:3001 (admin/admin)"
echo "  • Prometheus: http://localhost:9090"
echo "  • Alertmanager: http://localhost:9093"
echo "  • Kibana: http://localhost:5601"
echo "  • Jaeger: http://localhost:16686"
echo ""
echo "📈 Next steps:"
echo "  1. Import the Nexxau dashboard in Grafana"
echo "  2. Configure alert notifications in Alertmanager"
echo "  3. Set up log shipping to Elasticsearch"
echo "  4. Configure distributed tracing with Jaeger"
echo ""
echo "🔧 To stop the monitoring stack:"
echo "  docker-compose -f docker-compose.monitoring.yml down"
echo ""
echo "📝 To view logs:"
echo "  docker-compose -f docker-compose.monitoring.yml logs -f"
