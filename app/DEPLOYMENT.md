# SiteSafe AI - Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables
Ensure all production environment variables are set:

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=SiteSafe AI

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production

# WebSockets (optional)
NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
```

### 2. Database Migration
```bash
# Run Prisma migration for production
npx prisma migrate deploy

# Or push schema (if using db push)
npx prisma db push --accept-data-loss  # CAUTION: Only in initial setup

# Generate Prisma Client
npx prisma generate
```

### 3. Build Optimization
```bash
# Clean build
rm -rf .next

# Install dependencies
npm ci  # Use ci for production (installs exact versions from lock file)

# Build for production
npm run build

# Test production build locally
npm start
```

## 🔒 Security Hardening

### CSRF Protection
- NEXTAUTH_SECRET must be unique and strong (min 32 characters)
- Never commit .env files to git
- Use environment variables for all secrets

### Rate Limiting (TODO - Recommended)
Add rate limiting middleware for:
- Login attempts: 5 attempts per 15 minutes
- API calls: 100 requests per minute per IP
- Password reset: 3 attempts per hour

### Headers Security
Add to `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 📊 Performance Optimization

### Database
- Ensure all Prisma indexes are properly set (already done in schema)
- Set up connection pooling (Supabase does this automatically)
- Monitor slow queries using Prisma Studio or database logs

### Caching
- Enable Next.js ISR for static pages
- Use Redis for session storage (currently using JWT)
- Implement CDN for static assets

### Image Optimization
- Use Next.js Image component for all images
- Set up external image optimization service (e.g., Cloudinary)

## 🚀 Deployment Platforms

### Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

**Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add all variables from .env.local
3. Ensure `NEXTAUTH_URL` points to your production domain

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: sitesafe
      POSTGRES_USER: sitesafe
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 📈 Monitoring & Logging

### Error Tracking
Integrate Sentry:
```bash
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs
```

### Application Monitoring
- **Vercel Analytics**: Built-in if using Vercel
- **Google Analytics**: Add to `_app.tsx`
- **LogRocket**: Session replay and error tracking

### Database Monitoring
- Use Prisma Pulse for real-time database events
- Set up alerts for slow queries (> 1s)
- Monitor connection pool usage

## 🔍 Health Checks

Create health check endpoint:
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message
      },
      { status: 503 }
    );
  }
}
```

## 🔄 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Prisma Generate
        run: npx prisma generate
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🗄️ Database Backup Strategy

### Automated Backups (Supabase)
- Daily automated backups (included in Supabase)
- Point-in-time recovery available
- Set up additional backup cron job for audit logs

### Manual Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/sitesafe_$DATE.sql
echo "Backup created: sitesafe_$DATE.sql"
```

## 📱 Post-Deployment Tasks

### 1. Create Super Admin
```bash
# SSH into production server or use Prisma Studio
npx prisma studio

# Or run migration script to create initial admin
node scripts/create-super-admin.js
```

### 2. Test Critical Flows
- [ ] Login with each role type
- [ ] Create company → Create worksite → Invite user
- [ ] Alert creation and acknowledgment
- [ ] Email sending (invitation, notifications)
- [ ] Real-time updates (WebSocket)
- [ ] Dashboard loading and stats

### 3. SSL Certificate
- Ensure HTTPS is enabled
- Test certificate auto-renewal (Let's Encrypt)
- Verify all redirects from HTTP to HTTPS

### 4. DNS Configuration
```
A     @           -> Your server IP
CNAME www         -> @
CNAME ws          -> @ (for WebSocket if needed)
```

## 🛡️ Compliance & Legal

### GDPR Compliance
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Cookie consent banner
- [ ] Data export functionality
- [ ] Account deletion functionality

### Audit Logging
✅ Already implemented in `/app/lib/audit-logger.ts`
- All critical actions are logged
- Logs include IP address and timestamp
- Accessible to SUPER_ADMIN via `/admin/audit-logs`

## 📞 Support & Maintenance

### Monitoring Checklist
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error alerts (email/Slack)
- [ ] Set up performance monitoring
- [ ] Weekly database backup verification

### Update Strategy
- Use semantic versioning (semver)
- Test updates in staging environment first
- Maintain changelog in `CHANGELOG.md`
- Schedule maintenance windows for major updates

## 🚨 Rollback Plan

If deployment fails:
```bash
# Vercel: Instant rollback via dashboard
# Or via CLI
vercel rollback

# Docker: Switch to previous image
docker-compose down
docker-compose up -d --no-deps app:previous-tag
```

## 📝 Environment-Specific Notes

### Production
- All emails should use production SMTP
- WebSockets should use WSS (secure)
- All API calls over HTTPS
- Enable all security headers
- Minify and compress assets

### Staging (Optional but Recommended)
- Mirror production configuration
- Use separate database
- Test all changes here first
- Can use test SMTP (Mailtrap, etc.)

---

## 🎉 You're Ready to Deploy!

Follow this checklist and your SiteSafe AI application will be production-ready with:
- ✅ Multi-tenant architecture
- ✅ Role-based access control
- ✅ Email invitations & onboarding
- ✅ Real-time alerts
- ✅ Audit logging
- ✅ Comprehensive error handling
- ✅ Performance optimizations

**Need Help?** Check the troubleshooting section or open an issue in the repository.
