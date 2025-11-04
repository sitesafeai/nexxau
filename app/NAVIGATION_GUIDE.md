# 🧭 SiteSafe AI - Navigation Guide

## Navigation Structure by Role

### 🔴 SUPER_ADMIN (You & Your Team)

**Login:** http://localhost:3000/login
- Email: `admin@sitesafe.com`
- Password: `Admin123!`

**Navigation:**
```
┌─────────────────────────────────────┐
│ 🏠 Dashboard → /dashboard           │  ← Worksite view (if needed)
│ ⚙️  Admin Panel → /admin             │  ← Your main hub
└─────────────────────────────────────┘
```

**What you see at `/admin`:**
- Redirects to → `/admin/companies`
- Manage all companies
- Create companies
- Invite COMPANY_ADMIN users
- View audit logs (`/admin/audit-logs`)

**BLOCKED from:**
- ❌ `/company/*` routes (you don't belong to a company)

---

### 🟢 COMPANY_ADMIN (Company Owners)

**Login:** http://localhost:3000/login
- Email: `company.admin@test.com`
- Password: `Test123!`

**Navigation:**
```
┌─────────────────────────────────────┐
│ 🏢 Company → /company/dashboard     │  ← Manage your company
│ 📊 Analytics → /company/analytics   │  ← Company-wide stats
│ 👥 Team → /company/users            │  ← All team members
│ 🏠 Dashboard → /dashboard           │  ← View worksites
└─────────────────────────────────────┘
```

**What you see:**
1. **Company Dashboard** (`/company/dashboard`):
   - List of all your worksites
   - Create new worksites (multi-step wizard)
   - Invite users to worksites
   - Quick stats

2. **Analytics** (`/company/analytics`):
   - Company-wide safety score
   - Worksite performance breakdown
   - Top performers & at-risk sites
   - Compliance metrics

3. **Team** (`/company/users`):
   - All users across all your worksites
   - Search and filter
   - See roles and activation status

4. **Dashboard** (`/dashboard`):
   - Select and view individual worksites
   - Camera feeds
   - Alerts
   - Real-time monitoring

**BLOCKED from:**
- ❌ `/admin/*` routes (platform management)

---

### 🔵 SITE_ADMIN (Worksite Managers)

**Navigation:**
```
┌─────────────────────────────────────┐
│ 🏠 Dashboard → /dashboard           │  ← Only navigation
└─────────────────────────────────────┘
```

**What you see:**
- Only worksites you're assigned to
- Manage cameras
- Acknowledge/resolve alerts
- Invite workers and supervisors

**BLOCKED from:**
- ❌ `/admin/*` routes
- ❌ `/company/*` routes

---

### 🟡 SUPERVISOR (Alert Managers)

**Navigation:**
```
┌─────────────────────────────────────┐
│ 🏠 Dashboard → /dashboard           │  ← Only navigation
└─────────────────────────────────────┘
```

**What you see:**
- Assigned worksites only
- Can acknowledge/resolve alerts
- View camera feeds
- Monitor workers

**BLOCKED from:**
- ❌ `/admin/*` routes
- ❌ `/company/*` routes
- ❌ Creating cameras or inviting users

---

### 🟠 WORKER (View-Only)

**Navigation:**
```
┌─────────────────────────────────────┐
│ 🏠 Dashboard → /dashboard           │  ← Only navigation
└─────────────────────────────────────┘
```

**What you see:**
- Assigned worksites (read-only)
- View alerts (cannot acknowledge)
- View camera feeds

**BLOCKED from:**
- ❌ All `/admin/*` and `/company/*` routes
- ❌ Cannot acknowledge alerts
- ❌ Cannot invite users
- ❌ Cannot create/edit anything

---

## 🆕 Worksite Creation Flow

### Multi-Step Wizard at `/company/worksites/create`

**Step 1: Basic Info**
- Worksite name
- Location
- Full address
- Camera system type

**Step 2: Cameras** (Optional)
- Add multiple cameras
- For each camera:
  - Name (e.g., "Main Entrance")
  - Stream URL (RTSP or HLS)
  - Camera type (IP, PTZ, Analog)
  - Location (e.g., "North Gate")
- Can skip and add cameras later

**Step 3: Alert Zones** (Coming Soon)
- Define safety zones
- Set detection parameters
- Configure notifications
- Currently placeholder - configure after creation

**Step 4: Team** (Optional)
- Invite team members during setup
- Add email + role
- Invitations sent automatically
- Can skip and invite later

**On Completion:**
- Worksite created
- Cameras added (if any)
- Invitations sent (if any)
- Redirects to → `/company/worksites/{id}`

---

## 🎯 Navigation Logic

### "Company" Button (COMPANY_ADMIN only):
- **Purpose:** Manage your company
- **Destination:** `/company/dashboard`
- **Shows:** All worksites, company-wide actions

### "Dashboard" Button (Everyone):
- **Purpose:** Monitor specific worksites
- **Destination:** `/dashboard`
- **Shows:** 
  - SUPER_ADMIN: All worksites
  - COMPANY_ADMIN: Their worksites (can select)
  - Others: Only assigned worksites

### "Admin Panel" Button (SUPER_ADMIN only):
- **Purpose:** Platform management
- **Destination:** `/admin`
- **Shows:** All companies, audit logs, system settings

---

## 📊 Page Purpose Comparison

| Page | Purpose | Who Can Access |
|------|---------|----------------|
| `/admin` | **Platform Management** - Manage all companies | SUPER_ADMIN only |
| `/company/dashboard` | **Company Management** - Manage worksites | COMPANY_ADMIN only |
| `/company/analytics` | **Company Analytics** - Performance metrics | COMPANY_ADMIN only |
| `/company/users` | **Team Management** - All company users | COMPANY_ADMIN only |
| `/dashboard` | **Worksite Monitoring** - Real-time feeds & alerts | Everyone (filtered by access) |

---

## 🚀 Quick Reference

### I'm a SUPER_ADMIN, where do I:
- **Create companies?** → `/admin/companies` → "Create Company"
- **View audit logs?** → `/admin/audit-logs`
- **See all data?** → `/admin` (your main hub)

### I'm a COMPANY_ADMIN, where do I:
- **See all worksites?** → `/company/dashboard`
- **Create a worksite?** → Click "Create Worksite" → Wizard opens
- **See analytics?** → `/company/analytics`
- **Manage team?** → `/company/users`
- **Monitor cameras?** → `/dashboard` → Select worksite

### I'm a SITE_ADMIN, where do I:
- **See my worksites?** → `/dashboard`
- **Add cameras?** → Dashboard → Camera management
- **Invite workers?** → Dashboard → Invite button
- **Handle alerts?** → Dashboard → Active Alerts panel

---

## ✨ Key Features

✅ **No auto-camera creation** - Cameras are only added through the wizard or later  
✅ **Multi-step setup** - Comprehensive worksite configuration  
✅ **Separate dashboards** - Company vs Worksite view  
✅ **Role-based navigation** - See only what you can access  
✅ **Clear separation** - Platform management vs Company management  

---

*Updated: November 3, 2025*

