# Nexxau - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Production Deployment](#production-deployment)
4. [YOLO Training Guide](#yolo-training-guide)
5. [Zone Detection](#zone-detection)
6. [Email Setup](#email-setup)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Architecture](#architecture)

---

## Overview

Nexxau is a full-stack platform for live camera streaming, AI detection (YOLO), and dashboard management. It uses:
- **Next.js** frontend (app/)
- **FastAPI/Flask** backend (backend/)
- **YOLOv8 Inference Service** (ai-detection/)
- **MediaMTX** for RTSP/HLS streaming
- **Docker Compose** for orchestration

### Service Structure

- `app/` - Next.js frontend (user dashboard, camera feeds)
- `backend/` - FastAPI/Flask backend (API, DB access)
- `ai-detection/` - YOLOv8 inference (Flask or FastAPI)
- `prisma/` - Prisma schema and migrations
- `mediamtx.yml` - MediaMTX config (RTSP/HLS streaming)

---

## Quick Start

### Local Development

#### 1. Clone the Repo
```bash
git clone <your-repo-url>
cd nexxau
```

#### 2. Set Up Environment Variables
- Copy `.env.example` to `.env` in each service directory as needed.
- Fill in secrets (DB URL, API keys, etc.).

#### 3. Build & Run All Services
```bash
docker-compose up --build
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- YOLO Inference: [http://localhost:5000](http://localhost:5000)
- MediaMTX: [http://localhost:8888](http://localhost:8888)

#### 4. Seed the Database (if needed)
```bash
docker-compose exec backend npx prisma db seed
```

### Quick Server Restart

If you need to restart the server quickly:

```bash
cd /Users/luizcarneiro/nexxau/app

# Stop everything
pkill -9 node

# Fix file limit (MacOS Issue)
ulimit -n 65536

# Clean build
rm -rf .next
rm -rf node_modules/.cache
npx prisma generate

# Start server
npm run dev
```

Wait for "Ready" message, then open: `http://localhost:3001/dashboard`

### Environment Variables

Each service uses its own `.env` file for secrets/config.
**Never commit real secrets to git!**

Example for backend:
```env
DATABASE_URL=file:/app/prisma/dev.db
JWT_SECRET=your_jwt_secret
```

---

## Production Deployment

### Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL database (Supabase recommended)
- Twilio account for SMS notifications

### Environment Configuration

Create a `.env.production` file with the following variables:

**Database Configuration:**
```env
DATABASE_URL=postgresql://username:password@your-db-host:5432/nexxau_production
```

**SMS Configuration:**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

**Email Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@sitesafe.ai
FROM_NAME=SiteSafe
```

**Authentication:**
```env
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Database Setup

#### Option 1: Cloud PostgreSQL (Recommended)

1. **Supabase Setup:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your database URL from Settings > Database
   - Update `DATABASE_URL` in your environment

2. **Run Migrations:**
   ```bash
   cd app
   npx prisma migrate deploy
   npx prisma generate
   ```

#### Option 2: Self-Hosted PostgreSQL

1. **Install PostgreSQL:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   brew services start postgresql
   ```

2. **Create Database:**
   ```sql
   CREATE DATABASE nexxau_production;
   CREATE USER nexxau_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE nexxau_production TO nexxau_user;
   ```

### Docker Deployment

1. **Build and Deploy:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Verify Services:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

### Vercel Deployment (Recommended for Next.js)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd app
   vercel --prod
   ```

3. **Set Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Ensure `NEXTAUTH_URL` points to your production domain

### Domain & SSL Setup

1. **Configure DNS:**
   - Point your domain to your server's IP address
   - Add A record: `@` → `your-server-ip`
   - Add CNAME record: `www` → `your-domain.com`

2. **SSL Certificate:**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

### Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] SSL certificate valid
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Regular security updates
- [ ] Monitoring alerts configured

### Monitoring & Maintenance

1. **Health Checks:**
   - Application: `https://your-domain.com/api/health`
   - Database: Check connection status
   - MediaMTX: `http://your-domain.com:8888`

2. **Logs:**
   ```bash
   # Application logs
   docker-compose logs -f app
   
   # Database logs
   docker-compose logs -f db
   
   # MediaMTX logs
   docker-compose logs -f mediamtx
   ```

3. **Backups:**
   ```bash
   # Database backup
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   
   # Media files backup
   tar -czf media_backup_$(date +%Y%m%d).tar.gz ./media/
   ```

---

## YOLO Training Guide

### Detection Classes

Your YOLO model needs to detect **26 classes** across 5 categories:

#### Category 1: PPE (Personal Protective Equipment) - 12 classes

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 0 | `person_with_hardhat` | 🔴 CRITICAL | 5,000+ |
| 1 | `person_without_hardhat` | 🔴 CRITICAL | 5,000+ |
| 2 | `person_with_safety_vest` | 🔴 CRITICAL | 4,000+ |
| 3 | `person_without_safety_vest` | 🔴 CRITICAL | 4,000+ |
| 4 | `person_with_gloves` | 🟡 HIGH | 3,000+ |
| 5 | `person_without_gloves` | 🟡 HIGH | 3,000+ |
| 6 | `person_with_safety_goggles` | 🟡 HIGH | 2,500+ |
| 7 | `person_without_safety_goggles` | 🟡 HIGH | 2,500+ |
| 8 | `person_with_fall_harness` | 🔴 CRITICAL | 2,000+ |
| 9 | `person_without_fall_harness` | 🔴 CRITICAL | 2,000+ |
| 10 | `person_with_safety_boots` | 🟢 MEDIUM | 1,500+ |
| 11 | `person_without_safety_boots` | 🟢 MEDIUM | 1,500+ |

**Total PPE images needed: ~36,000 labeled images**

#### Category 2: Person States - 4 classes

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 12 | `person_standing` | 🟢 MEDIUM | 3,000+ |
| 13 | `person_fallen` | 🔴 CRITICAL | 2,000+ |
| 14 | `person_climbing` | 🟡 HIGH | 2,000+ |
| 15 | `person_running` | 🟡 HIGH | 1,500+ |

**Total: ~8,500 images**

#### Category 3: Heavy Equipment - 6 classes

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 16 | `forklift` | 🟡 HIGH | 2,000+ |
| 17 | `excavator` | 🟡 HIGH | 1,500+ |
| 18 | `crane` | 🟡 HIGH | 1,500+ |
| 19 | `ladder` | 🟢 MEDIUM | 1,500+ |
| 20 | `scaffolding` | 🟡 HIGH | 1,500+ |
| 21 | `power_tool` | 🟢 MEDIUM | 1,000+ |

**Total: ~9,000 images**

#### Category 4: Vehicles - 3 classes

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 22 | `truck` | 🟢 MEDIUM | 2,000+ |
| 23 | `van` | 🟢 MEDIUM | 1,000+ |
| 24 | `car` | 🟢 MEDIUM | 1,000+ |

**Total: ~4,000 images**

#### Category 5: Safety Barriers - 4 classes

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 25 | `safety_cone` | 🟢 MEDIUM | 1,500+ |
| 26 | `barrier` | 🟢 MEDIUM | 1,500+ |
| 27 | `caution_tape` | 🟢 MEDIUM | 1,000+ |
| 28 | `fire_extinguisher` | 🟢 MEDIUM | 1,000+ |

**Total: ~5,000 images**

### Total Dataset Size

- **Total Classes**: 29
- **Total Images Needed**: ~62,500 (minimum)
- **Recommended**: 100,000+ images for production-grade accuracy

### Training Priorities

#### Phase 1: MVP (Minimum Viable Product)
Train these **6 critical classes** first:

1. ✅ `person_with_hardhat` (5,000 images)
2. ✅ `person_without_hardhat` (5,000 images)
3. ✅ `person_with_safety_vest` (4,000 images)
4. ✅ `person_without_safety_vest` (4,000 images)
5. ✅ `person_fallen` (2,000 images)
6. ✅ `person_standing` (3,000 images)

**Total for MVP: 23,000 images**

### Dataset Sources

1. **Roboflow Universe** (Recommended)
   - Link: https://universe.roboflow.com/
   - Search: "construction safety", "PPE detection", "hard hat"
   - Free tier available

2. **Kaggle Datasets**
   - PPE Detection: https://www.kaggle.com/datasets/snehilsanyal/ppe-dataset
   - Hard Hat Detection: https://www.kaggle.com/datasets/andrewmvd/hard-hat-detection

3. **Open Images Dataset**
   - Link: https://storage.googleapis.com/openimages/web/index.html
   - Millions of images

### Training Command

```bash
# Install YOLOv8
pip install ultralytics

# Train the model
yolo task=detect mode=train \
  model=yolov8n.pt \
  data=ppe_detection.yaml \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  name=sitesafe_ppe_v1 \
  patience=20 \
  save=True \
  plots=True
```

### Hardware Requirements

| Model Size | GPU Required | Training Time | Inference Speed | Accuracy |
|------------|-------------|---------------|-----------------|----------|
| YOLOv8n (nano) | 4GB VRAM | 6-8 hours | 60+ FPS | ~85% |
| YOLOv8s (small) | 6GB VRAM | 10-12 hours | 45+ FPS | ~88% |
| YOLOv8m (medium) | 8GB VRAM | 16-20 hours | 30+ FPS | ~91% |
| YOLOv8l (large) | 12GB VRAM | 24-30 hours | 20+ FPS | ~93% |

**Recommendation**: Start with **YOLOv8s** (small) - good balance of speed and accuracy.

### Critical Success Metrics

Your model MUST achieve these for production:

| Metric | Target | Critical For |
|--------|--------|--------------|
| **Hard Hat Detection** | >92% mAP | OSHA compliance |
| **Safety Vest Detection** | >90% mAP | OSHA compliance |
| **Fall Detection** | >95% recall | Life safety |
| **False Positive Rate** | <3% | Prevent alert fatigue |
| **Inference Speed** | >15 FPS | Real-time monitoring |

---

## Zone Detection

### What Are Zones?

Zones are **areas you draw on your camera feed** to trigger alerts when specific objects enter them.

**Examples:**
- 🔴 Lunch area → Alert if forklift enters
- 🔴 Crane zone → Alert if person enters
- 🔵 Loading dock → Monitor activity only

### Creating a Zone

#### Step 1: Go to Alert Builder

1. Open dashboard: `http://localhost:3000/dashboard`
2. Click purple "Custom Rules" button (Quick Actions section)
3. Click "Create New Rule" button

Or go directly: `http://localhost:3000/dashboard/alert-builder`

#### Step 2: Fill Basic Info

```
Alert Name: "Lunch Area Forklift Alert"
Description: "Prevent forklifts from entering employee lunch area"
Camera: [Select the camera that views your lunch area]
```

⚠️ **Important**: You MUST select a specific camera (not "All Cameras") to draw zones!

#### Step 3: Choose "Zone Violation"

Select "Zone Violation" as the detection type.

#### Step 4: Configure Zone

```
Zone Name: "Employee Lunch Area"
Zone Type: [🔴 Restricted (No Entry) ▼]

What objects should trigger alerts in this zone?

☐ person_standing          ← Unchecked (people OK)
☐ person_without_hardhat   ← Unchecked
☑ forklift                 ← CHECKED! (alert on this)
☑ van                      ← CHECKED! (alert on this)
☑ truck                    ← CHECKED! (alert on this)
```

**Key Point**: Only check objects you want to TRIGGER alerts. Unchecked = allowed in zone.

#### Step 5: Draw Zone on Video

1. Click "Start Drawing" button
2. Click on the video feed to place points (minimum 3 points)
3. Click "Complete Zone" when done

The zone will appear highlighted on the video feed.

#### Step 6: Configure Actions

```
What should happen when this alert triggers?

☑ Create Alert
☑ Send SMS
☑ Send Email
☑ Sound Alarm
☐ Capture Video

SMS Recipients: +15551234567, +15559876543
Email Recipients: supervisor@company.com, safety@company.com
Severity: [High ▼]
```

#### Step 7: Review & Create

Review all settings and click "Create Alert".

### Zone Types

#### 🔴 Restricted Zone (Red)
**Use for**: No-entry areas (crane zones, machine areas, hazard zones)
**Alert when**: ANY selected object enters
**Example**: Crane exclusion zone → Alert on any person

#### 🔵 Monitored Zone (Blue)
**Use for**: Areas to watch (loading docks, exits, storage)
**Alert when**: Selected objects enter
**Example**: Loading dock → Alert on unauthorized vehicles

#### 🟢 Safe Zone (Green)
**Use for**: Approved areas (break rooms, tool storage)
**Alert when**: Prohibited objects enter
**Example**: Tool room → Alert on power tools

### Pro Tips

1. **Draw Larger Than Needed**: Add 5-10 foot buffer zone
2. **Use Simple Shapes**: Rectangle (4 clicks) or Pentagon (5 clicks)
3. **Test Before Enforcing**: Set severity to LOW first, monitor for false alarms
4. **Multiple Zones Per Camera**: You can create multiple zones on ONE camera

---

## Email Setup

### Quick Setup

#### Step 1: Install Dependencies

```bash
cd /Users/luizcarneiro/nexxau/app
npm install nodemailer @types/nodemailer
```

#### Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email Sender Info
FROM_EMAIL=noreply@sitesafe.ai
FROM_NAME=SiteSafe

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3005
```

### Email Provider Options

#### Option 1: Gmail (Easiest for Testing)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "SiteSafe"
   - Copy the 16-character password

3. **Update .env**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password from step 2
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=SiteSafe
```

#### Option 2: SendGrid (Production Recommended)

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Update .env:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=SiteSafe
```

### Testing Email Configuration

Create `test-email.ts`:

```typescript
import { testEmailConfiguration, sendWelcomeEmail } from './app/lib/email-service';

async function test() {
  console.log('🧪 Testing email configuration...');
  
  const configTest = await testEmailConfiguration();
  console.log('Config test:', configTest);
  
  if (configTest.success) {
    const result = await sendWelcomeEmail(
      'your-test-email@gmail.com',
      'Test User',
      'ABC Construction'
    );
    console.log('Welcome email test:', result);
  }
}

test();
```

Run it:
```bash
cd /Users/luizcarneiro/nexxau/app
npx tsx test-email.ts
```

---

## Testing Guide

### Prerequisites

✅ **Database seeded** with demo cameras
✅ **Dev server running** on `http://localhost:3000`
✅ **Database connection** working

### Feature Testing Checklist

#### 1. Camera Database Persistence

**Steps:**
1. Navigate to `http://localhost:3000/dashboard`
2. Click on **"Cameras"** tab
3. **Verify**: You see cameras listed
4. **Refresh the page** (Cmd+R)
5. **Verify**: Cameras are still there (not lost!)

#### 2. Camera Health Monitoring

**Steps:**
1. Go to `/dashboard` → **Cameras** tab
2. **Verify**: Each camera shows:
   - ✅ Status badge (online/offline/error)
   - 📍 Location
   - 🎥 Live video feed
   - ⏱️ "Last Activity" time

#### 3. AI Detection (YOLO)

**Steps:**
1. Go to `/dashboard` → **Monitoring** tab
2. **Verify**: You see all cameras in a grid
3. **Watch for AI detection overlays:**
   - 🟢 Green boxes: People
   - 🟠 Orange boxes: Vehicles
   - 🔵 Blue boxes: Equipment
   - 🟣 Magenta boxes: Barriers

**⚠️ Important Note:**
- Current detection uses **TensorFlow.js COCO-SSD**
- Detects generic objects (person, car, etc.)
- **NOT YET detecting PPE violations** (hardhat, safety vest)
- For production, need custom YOLO model

#### 4. Alert System

**Steps:**
1. Go to `/dashboard` → **Alerts** tab
2. **Verify**: Alert table displays with columns:
   - ID, Type, Severity, Location, Time, Status
3. **Test filters:**
   - Change **"Status"** dropdown → Select "ACTIVE"
   - Change **"Severity"** dropdown → Select "HIGH"
   - Use **search box** → Type "hardhat"

#### 5. Health Check Endpoint

**Steps:**
1. Open new tab: `http://localhost:3000/api/health`
2. **Verify response includes:**
   - Status: "healthy"
   - Database connection status
   - Camera status
   - Memory usage

### Success Metrics

After testing, you should see:

✅ **Cameras in database** (persisted)
✅ **All cameras showing as online** with green badges
✅ **Video feeds playing** in all camera views
✅ **AI detection overlays** with bounding boxes
✅ **FPS counter showing** (15-30 FPS)
✅ **Alerts displaying** in alerts tab
✅ **Health check returning 200** status
✅ **No errors** in browser or server console

---

## Troubleshooting

### Common Issues

#### Issue 1: "EMFILE: too many open files"
**Fix:**
```bash
ulimit -n 65536
```

#### Issue 2: "AlertStatus ENUM error"
**Fix:** Already fixed in latest code! Just restart.

#### Issue 3: "Prisma client not initialized"
**Fix:**
```bash
npx prisma generate
rm -rf .next
npm run dev
```

#### Issue 4: "Port 3001 already in use"
**Fix:**
```bash
lsof -ti:3001 | xargs kill -9
npm run dev
```

#### Issue 5: No cameras showing
**Solution:**
```bash
cd /Users/luizcarneiro/nexxau/app
npx tsx scripts/seed-cameras.ts --force
# Restart dev server
```

#### Issue 6: Cameras show as offline
**Solution:**
- Check if videos are playing
- Look for console errors
- Cameras auto-detect offline after 5 minutes of no activity
- Refresh the page to update health status

#### Issue 7: AI detection not working
**Solution:**
- Check browser console for errors
- TensorFlow.js loads on first page load (may take 10-15 seconds)
- Look for "Model loaded successfully" in console
- Try refreshing the page
- Make sure video is playing

#### Issue 8: Database connection failed
**Solution:**
```bash
# Check database URL
cat /Users/luizcarneiro/nexxau/app/.env | grep DATABASE_URL

# Regenerate Prisma client
cd /Users/luizcarneiro/nexxau/app
npx prisma generate

# Test connection
npx prisma studio
```

#### Issue 9: API returning 500 errors
**Solution:**
- Check server logs in terminal
- Look for database errors
- Check Prisma schema is up to date: `npx prisma db push`

### Email Troubleshooting

#### "Authentication failed"
- Check SMTP credentials
- For Gmail: Ensure 2FA is enabled and using App Password
- Verify SMTP_HOST and SMTP_PORT are correct

#### "Connection timeout"
- Check firewall settings
- Try different SMTP_PORT (465 for secure, 587 for TLS)
- Ensure SMTP_SECURE matches port (true for 465)

#### "Emails not arriving"
- Check spam folder
- Verify FROM_EMAIL is valid
- Check email provider's sending limits
- Look at Node.js console for errors

---

## Architecture

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web App       │    │   RTSP Server    │    │   YOLO Detection│
│   (Next.js)     │◄───┤   (Node.js)      │◄───┤   (Python)      │
│   Port: 3000    │    │   Port: 8888     │    │   Background    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   HLS Streams    │    │   Detection API │
│   (PostgreSQL)  │    │   (FFmpeg)       │    │   (Real-time)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase recommended)
- **AI Detection**: YOLOv8 (Python)
- **Streaming**: MediaMTX, FFmpeg
- **Authentication**: NextAuth.js
- **Email**: Nodemailer
- **SMS**: Twilio

### Logs & Troubleshooting

- View logs for all services:
  ```bash
  docker-compose logs -f
  ```
- Restart a service:
  ```bash
  docker-compose restart <service-name>
  ```

### Production Tips

- Use a real database (Postgres, MySQL) in production.
- Add HTTPS/reverse proxy (e.g., Traefik, Nginx).
- Use a secrets manager for sensitive config.
- Add centralized logging/monitoring (Loki, Prometheus, Grafana).
- Restrict public ports and secure endpoints.

---

## Safety-Critical Reminder

⚠️ **BEFORE PRODUCTION DEPLOYMENT:**

The system MUST be upgraded from Option C (Hybrid - generic person detection) to Option B (Custom YOLO - actual PPE/safety violation detection). 

**Current system uses TensorFlow.js COCO-SSD which only detects generic "person" but CANNOT detect:**
- Hardhats
- Safety vests
- PPE compliance
- Actual safety violations

**For production, need custom-trained YOLOv8/v9 model that detects:**
- Person WITH/WITHOUT hardhat
- Person WITH/WITHOUT safety vest
- Restricted zone violations
- Unsafe equipment use

**Current system is for infrastructure building only - NOT ready for real safety compliance.**

---

## Contributing

Pull requests welcome! Please open issues for bugs or feature requests.

---

## License

MIT

