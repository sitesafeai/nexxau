# Dashboard Architecture & Backend Flow

## Overview
This document explains how all dashboard elements work, from frontend display to backend data processing.

---

## 🎯 Dashboard Elements Breakdown

### 1. **Safety Score (50/100)**
**Frontend Component:** `SafetyScoreCard` in `app/app/components/SafetyScoreCard.tsx`  
**Backend API:** `/api/safety-score` (GET) and `/api/safety-score/calculate` (POST)  
**Service:** `app/app/lib/safety-score-service.ts`

#### How It Works:
1. **Frontend Request:**
   - `OverviewTab` component fetches: `GET /api/safety-score?worksiteId=xxx&date=2025-01-27`
   - If no score exists, automatically calls: `POST /api/safety-score/calculate`

2. **Backend Calculation Process:**
   ```
   GET /api/safety-score
   ↓
   Check if score exists in SafetyScore table
   ↓
   If exists: Return cached score
   If not: Trigger calculation
   ```

3. **Calculation Formula:**
   ```typescript
   Score = 100 × C × F_cov × (1 - P) × (1 + bonus)
   
   Where:
   - C = Base Compliance (0.5 to 1.0)
   - F_cov = Coverage Factor (based on camera count)
   - P = Violation Penalty (major + minor + custom alerts)
   - bonus = Consecutive Safe Days bonus
   ```

4. **Data Sources:**
   - **Violations:** `SafetyViolation` table (major/minor)
   - **Custom Alerts:** `Alert` table with custom types
   - **Cameras:** `Camera` table for coverage calculation
   - **Detections:** Estimated or from `Detection` table

5. **Database Tables:**
   - `SafetyScore` - Stores calculated scores per worksite/date
   - `SafetyViolation` - Major/minor violations
   - `SafetyScoreConfig` - Per-worksite configuration (weights, penalties)

---

### 2. **Active Alerts (0)**
**Frontend Component:** `AlertsTab` in `app/app/dashboard/page.tsx`  
**Backend API:** `/api/alerts?worksiteId=xxx&status=ACTIVE`

#### How It Works:
1. **Frontend Request:**
   ```typescript
   GET /api/alerts?worksiteId=xxx&status=ACTIVE
   ```

2. **Backend Query:**
   ```typescript
   // app/app/api/alerts/route.ts
   prisma.alert.findMany({
     where: {
       worksiteId: xxx,
       status: 'ACTIVE'
     }
   })
   ```

3. **Data Flow:**
   - Alerts are created by alert rules when conditions are met
   - Status can be: `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`
   - Frontend filters to show only `ACTIVE` alerts
   - Auto-refreshes every 10 seconds

4. **Database Table:**
   - `Alert` - Stores all alerts with severity, status, metadata

---

### 3. **Cameras Online (10/25)**
**Frontend Component:** `CameraManagementTab` in `app/app/components/camera/CameraManagementTab.tsx`  
**Backend API:** `/api/cameras?worksiteId=xxx`  
**Metrics API:** `/api/worksites/[id]/metrics`

#### How It Works:
1. **Frontend Request:**
   ```typescript
   GET /api/cameras?worksiteId=xxx
   ```

2. **Backend Query:**
   ```typescript
   // app/app/api/cameras/route.ts
   prisma.camera.findMany({
     where: { worksiteId: xxx }
   })
   ```

3. **Status Calculation:**
   ```typescript
   // In metrics route
   const activeCameras = cameras.filter(c => 
     c.status?.toLowerCase() === 'online' || 
     c.status?.toLowerCase() === 'active'
   ).length;
   ```

4. **Camera Status Values:**
   - `online` / `active` → Counted as online
   - `offline` / `error` / `maintenance` → Counted as offline

5. **Database Table:**
   - `Camera` - Stores camera info, status, stream URLs

---

### 4. **Violations (24h) (0)**
**Backend API:** `/api/safety-score/calculate` (part of safety score calculation)  
**Database:** `SafetyViolation` table

#### How It Works:
1. **Data Source:**
   - Violations are created when safety rules are triggered
   - Stored in `SafetyViolation` table with `severity` (MAJOR/MINOR)

2. **24-Hour Count:**
   ```typescript
   // In safety score calculation
   const safetyViolations = await prisma.safetyViolation.findMany({
     where: {
       worksiteId,
       createdAt: { gte: startOfDay, lte: endOfDay }
     }
   });
   ```

3. **Database Table:**
   - `SafetyViolation` - Stores violations with timestamp, type, severity

---

### 5. **Site Health Metrics**

#### **Camera Uptime (7d) - 99.5%**
**Backend API:** `/api/worksites/[id]/metrics`  
**Calculation:**
- Fetches camera health records from `CameraHealth` table
- Calculates uptime percentage over last 7 days
- Formula: `(online_time / total_time) × 100`

#### **AI Cameras Active (0/25)**
**Backend API:** `/api/worksites/[id]/metrics`  
**Calculation:**
```typescript
const aiEnabledCameras = cameras.filter(c => c.aiEnabled === true).length;
```

#### **High Priority Alerts (0)**
**Backend API:** `/api/worksites/[id]/metrics`  
**Calculation:**
```typescript
const highAlerts = alerts.filter(a => 
  a.severity?.toLowerCase() === 'high' || 
  a.severity?.toLowerCase() === 'critical'
).length;
```

#### **Last Activity (58d ago)**
**Backend API:** `/api/worksites/[id]/metrics`  
**Calculation:**
- Checks most recent timestamp from:
  - Latest alert `createdAt`
  - Latest camera `lastDetection`
  - Worksite `updatedAt`
- Returns the most recent of these

---

## 🔄 Data Flow Diagram

```
┌─────────────────┐
│   Frontend      │
│  (Dashboard)    │
└────────┬────────┘
         │
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Next.js API    │
│    Routes       │
└────────┬────────┘
         │
         │ Prisma Queries
         ▼
┌─────────────────┐
│   PostgreSQL    │
│    Database     │
└─────────────────┘
```

---

## 📡 API Endpoints Reference

### Safety Score
- **GET** `/api/safety-score?worksiteId=xxx&date=2025-01-27`
  - Returns existing safety score or triggers calculation
  
- **POST** `/api/safety-score/calculate`
  - Body: `{ worksiteId, date, forceRecalculate? }`
  - Calculates and stores safety score

### Alerts
- **GET** `/api/alerts?worksiteId=xxx&status=ACTIVE`
  - Returns active alerts for worksite

### Cameras
- **GET** `/api/cameras?worksiteId=xxx`
  - Returns all cameras for worksite

### Metrics
- **GET** `/api/worksites/[id]/metrics`
  - Returns aggregated metrics:
    - Active/offline cameras
    - AI-enabled cameras
    - Alert counts by severity
    - Safety score
    - Last activity timestamp

---

## 🗄️ Database Schema (Key Tables)

### `SafetyScore`
```prisma
model SafetyScore {
  id          String   @id @default(cuid())
  worksiteId  String
  date        DateTime @db.Date
  safetyScore Float
  grade       String
  breakdown   Json?    // Full calculation breakdown
  createdAt   DateTime @default(now())
  
  @@unique([worksiteId, date])
}
```

### `Alert`
```prisma
model Alert {
  id          String   @id @default(cuid())
  worksiteId  String
  title       String
  description String?
  severity    String   // CRITICAL, HIGH, MEDIUM, LOW
  status      String   // ACTIVE, ACKNOWLEDGED, RESOLVED
  createdAt   DateTime @default(now())
}
```

### `Camera`
```prisma
model Camera {
  id          String   @id @default(cuid())
  worksiteId  String
  name        String
  status      String?  // online, offline, active, error
  aiEnabled   Boolean  @default(false)
  streamUrl   String?
  hlsUrl      String?
  lastDetection DateTime?
}
```

### `SafetyViolation`
```prisma
model SafetyViolation {
  id          String   @id @default(cuid())
  worksiteId  String
  severity    String   // MAJOR, MINOR
  type        String
  createdAt   DateTime @default(now())
}
```

---

## 🔧 Key Services

### `safety-score-service.ts`
- **Function:** `calculateSafetyScore()`
- **Purpose:** Implements the safety score formula
- **Inputs:** Violations, detections, config
- **Outputs:** Score (0-100), grade (A-F), breakdown

### `backgroundStreamManager.ts`
- **Purpose:** Manages background HLS streams
- **Functionality:** Keeps streams alive for instant playback

### `hlsManager.ts`
- **Purpose:** Converts RTSP → HLS using FFmpeg
- **Functionality:** Spawns FFmpeg processes, manages stream lifecycle

---

## 🎨 Frontend Components

### `OverviewTab`
- Displays safety score card
- Shows key metrics (alerts, cameras, violations)
- Fetches data on mount and when worksite changes

### `AlertsTab`
- Lists active alerts with filtering/sorting
- Auto-refreshes every 10 seconds
- Handles acknowledge/download actions

### `CameraManagementTab`
- Displays camera grid with status
- Handles RTSP → HLS conversion
- Manages background streaming

### `SafetyScoreCard`
- Renders safety score with breakdown
- Shows trends, violations, recommendations
- Handles refresh action

---

## 🔄 Real-Time Updates

### Auto-Refresh Mechanisms:
1. **Alerts:** 10-second interval
2. **Cameras:** 60-second interval (background)
3. **Safety Score:** Manual refresh only (expensive calculation)

### Background Streaming:
- Cameras that have been viewed keep streams alive
- Uses hidden video elements
- Managed by `backgroundStreamManager`

---

## 🚀 Performance Considerations

1. **Safety Score Calculation:**
   - Expensive operation (queries multiple tables)
   - Results are cached in `SafetyScore` table
   - Only recalculates when `forceRecalculate=true`

2. **Camera Status:**
   - Status checked on-demand
   - No real-time polling (uses cached status)

3. **Alert Refresh:**
   - 10-second polling interval
   - Could be optimized with WebSockets in future

---

## 📝 Notes

- All API routes use Prisma ORM for database access
- Authentication handled via NextAuth sessions
- Error handling includes retry logic and user-friendly messages
- All async operations have loading states and error states

