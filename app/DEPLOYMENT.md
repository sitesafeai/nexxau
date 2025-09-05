# 🚀 Nexxau Production Deployment Guide

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Vercel account (recommended) or Firebase
- Domain name (optional but recommended)
- Twilio account for SMS notifications
- Cloudinary account for image storage

## 🔧 Step 1: Environment Configuration

### 1.1 Create Production Environment File

```bash
# Copy the production template
cp env.production.template .env.production

# Edit with your actual values
nano .env.production
```

### 1.2 Generate Secure Secrets

```bash
# Generate NextAuth secret (32+ characters)
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32
```

### 1.3 Required Environment Variables

**Essential (must be set):**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secure random string
- `NEXTAUTH_URL` - Your production domain
- `JWT_SECRET` - Secure random string
- `ENCRYPTION_KEY` - Secure random string

**Recommended:**
- `TWILIO_ACCOUNT_SID` - For SMS notifications
- `TWILIO_AUTH_TOKEN` - For SMS notifications
- `CLOUDINARY_API_KEY` - For image uploads
- `SENTRY_DSN` - For error monitoring

## 🗄️ Step 2: Database Setup

### 2.1 PostgreSQL Setup

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt-get install postgresql  # Ubuntu

# Start PostgreSQL
brew services start postgresql

# Create database
createdb nexxau_production
```

**Option B: Cloud PostgreSQL (Recommended)**
- [Supabase](https://supabase.com) (Free tier available)
- [Neon](https://neon.tech) (Serverless, free tier)
- [Railway](https://railway.app) (Simple setup)

### 2.2 Run Database Setup Script

```bash
# Make script executable
chmod +x scripts/setup-production-db.sh

# Run setup
./scripts/setup-production-db.sh
```

### 2.3 Manual Database Setup (Alternative)

```bash
# Switch to production schema
cp prisma/schema.production.prisma prisma/schema.prisma

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify setup
npx prisma studio
```

## 🏗️ Step 3: Production Build

### 3.1 Install Dependencies

```bash
npm ci --only=production
```

### 3.2 Build Application

```bash
npm run build
```

### 3.3 Test Production Build

```bash
npm start
```

## 🚀 Step 4: Deployment

### 4.1 Vercel Deployment (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all variables from `.env.production`

### 4.2 Firebase Deployment (Alternative)

1. **Install Firebase CLI**
```bash
npm i -g firebase-tools
```

2. **Login to Firebase**
```bash
firebase login
```

3. **Initialize Firebase**
```bash
firebase init hosting
```

4. **Build and Deploy**
```bash
npm run build
firebase deploy
```

## 🔒 Step 5: Security & Monitoring

### 5.1 Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection

### 5.2 Monitoring Setup

**Sentry (Error Tracking)**
1. Create account at [sentry.io](https://sentry.io)
2. Add `SENTRY_DSN` to environment variables
3. Test error reporting

**Analytics (Optional)**
1. Google Analytics
2. Vercel Analytics
3. Custom event tracking

### 5.3 Performance Monitoring

- Vercel Analytics (built-in)
- Core Web Vitals monitoring
- Database query performance
- API response times

## 📱 Step 6: Feature Testing

### 6.1 Core Functionality

- [ ] User authentication
- [ ] Role-based access control
- [ ] Dashboard functionality
- [ ] Camera integration
- [ ] Alert system
- [ ] SMS notifications
- [ ] Email notifications
- [ ] Report generation

### 6.2 Camera & AI Integration

- [ ] RTSP stream connection
- [ ] AI violation detection
- [ ] Real-time alerts
- [ ] Video recording
- [ ] Image storage

### 6.3 Notification System

- [ ] SMS via Twilio
- [ ] Email notifications
- [ ] In-app alerts
- [ ] Escalation workflows

## 🔄 Step 7: Maintenance & Updates

### 7.1 Database Backups

```bash
# Automated backup script
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

### 7.2 Monitoring Alerts

- Set up uptime monitoring
- Configure error rate alerts
- Monitor database performance
- Track API usage

### 7.3 Update Process

1. Test changes locally
2. Deploy to staging (if available)
3. Run database migrations
4. Deploy to production
5. Verify functionality

## 🆘 Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version
- Clear `.next` cache
- Verify all dependencies installed

**Database Connection Issues**
- Check `DATABASE_URL` format
- Verify network access
- Check PostgreSQL status

**Environment Variable Issues**
- Ensure all required variables set
- Check variable names match code
- Restart deployment after changes

### Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

## 📞 Next Steps

After deployment:

1. **Test all features thoroughly**
2. **Set up monitoring and alerts**
3. **Configure backup schedules**
4. **Document deployment process**
5. **Train team on maintenance**
6. **Plan scaling strategy**

---

**Need Help?** Check the troubleshooting section or create an issue in the repository. 