# 🚀 Nexxau Production Deployment Guide

This guide covers the complete deployment of the Nexxau AI-powered construction safety monitoring system to production.

## 📋 Prerequisites

### Required Tools
- **Docker** (20.10+)
- **Docker Compose** (2.0+)
- **Kubernetes** (1.24+)
- **kubectl** (1.24+)
- **Helm** (3.0+) - Optional
- **Git** (2.30+)

### Required Services
- **PostgreSQL** (15+) - Database
- **Redis** (7+) - Caching and sessions
- **NVIDIA GPU** - For AI detection (optional for CPU-only mode)

### Required Secrets
Create the following secrets in your Kubernetes cluster:

```bash
kubectl create secret generic nexxau-secrets \
  --from-literal=POSTGRES_PASSWORD=your_postgres_password \
  --from-literal=REDIS_PASSWORD=your_redis_password \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=JWT_REFRESH_SECRET=your_jwt_refresh_secret \
  --from-literal=NEXTAUTH_SECRET=your_nextauth_secret \
  --from-literal=SENTRY_DSN=your_sentry_dsn \
  --from-literal=GRAFANA_PASSWORD=your_grafana_password \
  --from-literal=SMTP_PASSWORD=your_smtp_password
```

## 🐳 Docker Deployment

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-org/nexxau.git
cd nexxau

# Copy environment file
cp app/.env.example app/.env.production

# Edit environment variables
nano app/.env.production

# Start the application
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

### Environment Configuration
Update the following environment variables in `app/.env.production`:

```env
# Database
DATABASE_URL=postgresql://nexxau_user:password@postgres:5432/nexxau_production
REDIS_URL=redis://:password@redis:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
GRAFANA_PASSWORD=your-grafana-password

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com
```

## ☸️ Kubernetes Deployment

### 1. Prepare Kubernetes Cluster
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
```

### 2. Deploy Database
```bash
# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n nexxau --timeout=300s
```

### 3. Deploy Application
```bash
# Deploy main application
kubectl apply -f k8s/app.yaml

# Deploy AI detection service
kubectl apply -f k8s/ai-detection.yaml

# Configure ingress
kubectl apply -f k8s/ingress.yaml
```

### 4. Verify Deployment
```bash
# Check pod status
kubectl get pods -n nexxau

# Check services
kubectl get services -n nexxau

# Check ingress
kubectl get ingress -n nexxau

# Check logs
kubectl logs -f deployment/app -n nexxau
kubectl logs -f deployment/ai-detection -n nexxau
```

## 🔧 Configuration

### Database Setup
```bash
# Run database migrations
kubectl exec -it deployment/app -n nexxau -- npx prisma migrate deploy

# Seed database (optional)
kubectl exec -it deployment/app -n nexxau -- npx prisma db seed
```

### SSL/TLS Configuration
1. Obtain SSL certificates (Let's Encrypt recommended)
2. Update the TLS secret:
```bash
kubectl create secret tls nexxau-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n nexxau
```

### Monitoring Setup
```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/

# Access monitoring dashboards
kubectl port-forward -n nexxau service/grafana 3001:3000
kubectl port-forward -n nexxau service/prometheus 9090:9090
```

## 📊 Monitoring and Observability

### Health Checks
- **Application**: `http://your-domain.com/api/health`
- **Metrics**: `http://your-domain.com/api/metrics`
- **Database**: Automatic health checks via Kubernetes probes

### Monitoring Dashboards
- **Grafana**: `http://monitoring.your-domain.com/grafana`
- **Prometheus**: `http://monitoring.your-domain.com/prometheus`
- **Alertmanager**: `http://monitoring.your-domain.com/alertmanager`

### Log Aggregation
- **Application Logs**: `kubectl logs -f deployment/app -n nexxau`
- **AI Detection Logs**: `kubectl logs -f deployment/ai-detection -n nexxau`
- **Database Logs**: `kubectl logs -f deployment/postgres -n nexxau`

## 🔒 Security Configuration

### Network Policies
```bash
# Apply network policies
kubectl apply -f k8s/network-policies.yaml
```

### RBAC Configuration
```bash
# Apply RBAC policies
kubectl apply -f k8s/rbac.yaml
```

### Security Scanning
```bash
# Run security scan
kubectl apply -f k8s/security-scan.yaml
```

## 🚀 CI/CD Pipeline

### GitHub Actions
The CI/CD pipeline is configured in `.github/workflows/ci-cd.yml` and includes:

1. **Testing**: Unit tests, integration tests, E2E tests
2. **Security**: Vulnerability scanning with Trivy
3. **Building**: Docker image building and pushing
4. **Deployment**: Automatic deployment to staging and production

### Manual Deployment
```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Deploy to production
./scripts/deploy-production.sh
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
kubectl get pods -l app=postgres -n nexxau

# Check database logs
kubectl logs -f deployment/postgres -n nexxau

# Test database connection
kubectl exec -it deployment/app -n nexxau -- npx prisma db push
```

#### 2. AI Detection Service Issues
```bash
# Check AI service status
kubectl get pods -l app=ai-detection -n nexxau

# Check AI service logs
kubectl logs -f deployment/ai-detection -n nexxau

# Check GPU availability
kubectl describe nodes | grep nvidia.com/gpu
```

#### 3. Application Issues
```bash
# Check application status
kubectl get pods -l app=app -n nexxau

# Check application logs
kubectl logs -f deployment/app -n nexxau

# Check application health
kubectl port-forward -n nexxau service/app 3000:3000
curl http://localhost:3000/api/health
```

### Performance Optimization

#### 1. Resource Limits
```bash
# Check resource usage
kubectl top pods -n nexxau
kubectl top nodes
```

#### 2. Horizontal Pod Autoscaling
```bash
# Check HPA status
kubectl get hpa -n nexxau

# Scale manually
kubectl scale deployment app --replicas=5 -n nexxau
```

#### 3. Database Optimization
```bash
# Check database performance
kubectl exec -it deployment/postgres -n nexxau -- psql -U nexxau_user -d nexxau_production -c "SELECT * FROM pg_stat_activity;"
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale application
kubectl scale deployment app --replicas=5 -n nexxau

# Scale AI detection
kubectl scale deployment ai-detection --replicas=3 -n nexxau
```

### Vertical Scaling
Update resource limits in the deployment manifests:
```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

## 🔄 Backup and Recovery

### Database Backup
```bash
# Create backup
kubectl exec -it deployment/postgres -n nexxau -- pg_dump -U nexxau_user nexxau_production > backup.sql

# Restore backup
kubectl exec -i deployment/postgres -n nexxau -- psql -U nexxau_user nexxau_production < backup.sql
```

### Application Backup
```bash
# Backup application data
kubectl exec -it deployment/app -n nexxau -- tar -czf /tmp/app-backup.tar.gz /app/data

# Copy backup
kubectl cp nexxau/app-pod:/tmp/app-backup.tar.gz ./app-backup.tar.gz
```

## 📞 Support

### Getting Help
- **Documentation**: Check this guide and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas

### Monitoring and Alerts
- **Health Checks**: Monitor application health endpoints
- **Logs**: Check application and service logs
- **Metrics**: Monitor Prometheus metrics and Grafana dashboards
- **Alerts**: Configure Alertmanager for critical issues

---

**🎉 Congratulations! Your Nexxau production deployment is now complete and ready for use.**
