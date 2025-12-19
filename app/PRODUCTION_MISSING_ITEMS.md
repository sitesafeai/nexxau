# Production Missing Items Checklist

## ✅ Safety Systems Implemented

All foundational safety systems are now in place:
- ✅ Camera Watchdog & Circuit Breakers
- ✅ Frame Validation & Input Sanitization
- ✅ Alert State Machine with Override Handling
- ✅ Enhanced Retry Logic (with jitter & rate limiting)
- ✅ Database Transaction Safety
- ✅ API Versioning & Correlation IDs
- ✅ Inference Timeout & GPU Safety
- ✅ Observability & Monitoring Hooks
- ✅ Environment Validation

See `SAFETY_SYSTEMS_IMPLEMENTATION.md` for details.

---

## 🔴 Critical - Blocking Production

### 1. YOLO/AI Detection Service Integration
**Status**: ⚠️ Partially Implemented

**Current State:**
- Python YOLO services exist in `ai-detection/` directory
- Detection endpoint (`/api/yolo/detections`) receives detections but doesn't run inference
- No clear integration between Next.js app and AI detection service

**Missing:**
- [ ] **AI Detection Service Deployment**: YOLO service needs to be deployed as separate service
- [ ] **Service Discovery**: How Next.js app finds/connects to AI service
- [ ] **API Integration**: Endpoint to send frames to AI service and receive detections
- [ ] **Model Management**: Where YOLO models are stored/loaded
- [ ] **GPU Configuration**: If using GPU, need proper resource allocation
- [ ] **Health Checks**: AI service health monitoring
- [ ] **Fallback Strategy**: What happens when AI service is down

**Required Environment Variables:**
```env
AI_DETECTION_SERVICE_URL=http://ai-detection:8000
AI_DETECTION_API_KEY=your-api-key-here
YOLO_MODEL_PATH=/app/models/yolov8n.pt
GPU_ENABLED=true
GPU_DEVICE_ID=0
```

**Action Items:**
1. Deploy AI detection service (Docker/K8s)
2. Create API client in Next.js to call AI service
3. Add timeout and retry logic for AI service calls
4. Implement fallback when AI service unavailable

---

### 2. Twilio Credentials Configuration
**Status**: ⚠️ Code Exists, Credentials Missing

**Current State:**
- SMS service implemented (`app/lib/sms-service.ts`)
- Twilio SDK installed
- Environment variables referenced but not set

**Missing:**
- [ ] **Twilio Account SID**: `TWILIO_ACCOUNT_SID`
- [ ] **Twilio Auth Token**: `TWILIO_AUTH_TOKEN`
- [ ] **Twilio Phone Number**: `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
- [ ] **Production Phone Number**: Need verified Twilio number
- [ ] **Rate Limiting Configuration**: SMS rate limits per hour/day
- [ ] **Delivery Status Callbacks**: Webhook URL for delivery status

**Required Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
# OR use Messaging Service (recommended)
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SMS Configuration
SMS_ENABLED=true
SMS_RATE_LIMIT_PER_HOUR=100
SMS_RATE_LIMIT_PER_DAY=1000
SMS_STATUS_CALLBACK_URL=https://your-domain.com/api/sms/status-callback
```

**Action Items:**
1. Create Twilio account (if not exists)
2. Purchase/verify phone number
3. Set up Messaging Service (recommended for production)
4. Add credentials to production environment
5. Test SMS delivery

---

### 3. Database Connection & Secrets
**Status**: ⚠️ Partially Configured

**Current State:**
- Supabase connection string exists in `env.production`
- Database schema exists
- Prisma configured

**Missing:**
- [ ] **Production Database URL**: Verify Supabase connection works
- [ ] **Connection Pooling**: Ensure pooler URL is correct
- [ ] **Direct Connection URL**: For migrations
- [ ] **Database Backups**: Automated backup strategy
- [ ] **Migration Strategy**: How to run migrations in production

**Required Environment Variables:**
```env
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...db.supabase.co:5432/postgres
```

**Action Items:**
1. Verify database connectivity
2. Test connection pooling
3. Set up automated backups
4. Document migration process

---

### 4. Authentication Secrets
**Status**: ⚠️ Partially Configured

**Missing:**
- [ ] **NEXTAUTH_SECRET**: Must be unique, 32+ characters
- [ ] **JWT_SECRET**: For token signing
- [ ] **ENCRYPTION_KEY**: For data encryption
- [ ] **SESSION_SECRET**: For session management
- [ ] **OAuth Provider Credentials**: Google, etc. (if used)

**Required Environment Variables:**
```env
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://your-domain.com
JWT_SECRET=generate-secure-random-string
ENCRYPTION_KEY=generate-32-byte-key
SESSION_SECRET=generate-secure-random-string
```

**Action Items:**
1. Generate all secrets (never reuse)
2. Store securely (use secrets manager)
3. Rotate regularly

---

### 5. Cloud Storage Configuration
**Status**: ⚠️ Partially Configured

**Missing:**
- [ ] **Cloudinary Credentials**: For image/video storage
- [ ] **S3/Storage Bucket**: Alternative storage option
- [ ] **CDN Configuration**: For asset delivery
- [ ] **Upload Limits**: Max file sizes

**Required Environment Variables:**
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
# OR
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

---

## 🟡 Important - Should Have Before Production

### 6. Monitoring & Observability
**Missing:**
- [ ] **Sentry DSN**: Error tracking
- [ ] **Logging Service**: Centralized logging (Datadog, LogRocket, etc.)
- [ ] **Metrics Collection**: Prometheus/Grafana
- [ ] **Uptime Monitoring**: Pingdom, UptimeRobot, etc.
- [ ] **Alerting**: PagerDuty, Opsgenie, etc.

**Required Environment Variables:**
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
METRICS_ENABLED=true
```

---

### 7. Email Service Configuration
**Status**: ⚠️ Partially Configured

**Missing:**
- [ ] **SMTP Credentials**: Gmail/Resend/SendGrid
- [ ] **From Address**: Verified sender email
- [ ] **Email Templates**: Production-ready templates

**Required Environment Variables:**
```env
# Option 1: Resend (Recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@your-domain.com

# Option 2: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com
```

---

### 8. API Versioning & Correlation IDs
**Status**: ⚠️ Partially Implemented

**Missing:**
- [ ] **API Version Headers**: `/api/v1/...` routing
- [ ] **Version Negotiation**: Client specifies version
- [ ] **Backward Compatibility**: Handle old API versions
- [ ] **Correlation ID Middleware**: Add to all requests

---

### 9. Rate Limiting & DDoS Protection
**Missing:**
- [ ] **API Rate Limiting**: Per-IP, per-user limits
- [ ] **DDoS Protection**: Cloudflare/AWS Shield
- [ ] **WAF Rules**: Web Application Firewall
- [ ] **IP Whitelisting**: For admin endpoints

---

### 10. SSL/TLS Certificates
**Missing:**
- [ ] **SSL Certificate**: Let's Encrypt or commercial
- [ ] **Certificate Auto-Renewal**: Automated renewal
- [ ] **HSTS Headers**: Security headers
- [ ] **TLS Version**: Enforce TLS 1.2+

---

## 🟢 Nice to Have - Post-Launch

### 11. CDN Configuration
- CloudFront/Cloudflare for static assets
- Image optimization
- Caching strategy

### 12. Backup & Disaster Recovery
- Automated database backups
- Backup retention policy
- Disaster recovery plan
- RTO/RPO targets

### 13. Performance Optimization
- Redis caching
- Database query optimization
- Image optimization
- Code splitting

---

## 📋 Production Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] Database migrations tested
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] Monitoring tools set up
- [ ] Backup strategy in place

### Deployment
- [ ] Build production bundle
- [ ] Run database migrations
- [ ] Deploy application
- [ ] Verify health checks
- [ ] Test critical paths
- [ ] Monitor error rates

### Post-Deployment
- [ ] Verify all services running
- [ ] Test SMS notifications
- [ ] Test email notifications
- [ ] Test AI detection pipeline
- [ ] Monitor performance metrics
- [ ] Set up alerting

---

## 🔧 Quick Setup Commands

### Generate Secrets
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# JWT_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (32 bytes)
openssl rand -base64 32

# SESSION_SECRET
openssl rand -base64 32
```

### Test Database Connection
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Test Prisma
npx prisma db pull
```

### Test Twilio
```bash
# Use test script
node test-sms.js
```

---

## 🚨 Critical Path Items (Do First)

1. **AI Detection Service** - Without this, no detections work
2. **Database Connection** - Without this, nothing works
3. **Authentication Secrets** - Without this, users can't log in
4. **Twilio Credentials** - Without this, SMS notifications fail
5. **Environment Variables** - All must be set correctly

---

## 📝 Notes

- Never commit `.env` files to git
- Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Test all integrations before production
- Have rollback plan ready

