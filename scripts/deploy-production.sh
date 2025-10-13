#!/bin/bash

# Nexxau Production Deployment Script
echo "🚀 Deploying Nexxau to Production..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured. Please configure kubectl first."
    exit 1
fi

# Set namespace
NAMESPACE="nexxau"

echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "🔧 Applying configurations..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

echo "🗄️ Deploying PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

echo "🚀 Deploying application..."
kubectl apply -f k8s/app.yaml

echo "🤖 Deploying AI detection service..."
kubectl apply -f k8s/ai-detection.yaml

echo "🌐 Configuring ingress..."
kubectl apply -f k8s/ingress.yaml

echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=ready pod -l app=app -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=ai-detection -n $NAMESPACE --timeout=300s

echo "🔍 Checking deployment status..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo "📊 Checking application health..."
kubectl port-forward -n $NAMESPACE service/app 3000:3000 &
PORT_FORWARD_PID=$!

sleep 10

# Check health endpoint
if curl -f http://localhost:3000/api/health; then
    echo "✅ Application is healthy!"
else
    echo "❌ Application health check failed!"
    kill $PORT_FORWARD_PID
    exit 1
fi

kill $PORT_FORWARD_PID

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "  • Namespace: $NAMESPACE"
echo "  • Application: http://localhost:3000"
echo "  • Health Check: http://localhost:3000/api/health"
echo "  • Metrics: http://localhost:3000/api/metrics"
echo ""
echo "🔧 Useful commands:"
echo "  • kubectl get pods -n $NAMESPACE"
echo "  • kubectl logs -f deployment/app -n $NAMESPACE"
echo "  • kubectl logs -f deployment/ai-detection -n $NAMESPACE"
echo "  • kubectl describe pod <pod-name> -n $NAMESPACE"
echo ""
echo "📈 Monitoring:"
echo "  • Grafana: http://localhost:3001"
echo "  • Prometheus: http://localhost:9090"
echo "  • Alertmanager: http://localhost:9093"
echo ""
echo "🛠️ Troubleshooting:"
echo "  • Check pod logs: kubectl logs <pod-name> -n $NAMESPACE"
echo "  • Check pod status: kubectl describe pod <pod-name> -n $NAMESPACE"
echo "  • Check service endpoints: kubectl get endpoints -n $NAMESPACE"
echo "  • Check ingress: kubectl describe ingress nexxau-ingress -n $NAMESPACE"
echo ""
