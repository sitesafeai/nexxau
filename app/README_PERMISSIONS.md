# SiteSafe AI - Permissions & Multi-Tenant System

## 🏢 Multi-Tenant Architecture

SiteSafe AI supports multiple companies, each with their own worksites, users, and data.

### Hierarchy
```
SUPER_ADMIN (You)
└── Companies
    └── COMPANY_ADMIN
        └── Worksites
            ├── SITE_ADMIN
            ├── SUPERVISOR
            ├── WORKER
            └── VIEWER
```

## 👥 User Roles & Permissions

### SUPER_ADMIN
**Platform Management Only** - You and your team (no company association)

**Can:**
- ✅ Access admin panel (`/admin`) ONLY
- ✅ Create, view, edit, delete ANY company
- ✅ Invite COMPANY_ADMIN users to companies
- ✅ View audit logs for entire system
- ✅ View all companies and worksites
- ✅ Manage system-wide settings

**Cannot:**
- ❌ Access `/company/*` routes (not a company owner)
- ❌ Belong to any company (platform manager)
- ❌ Directly manage worksites (done through companies)

**Dashboard:** `/admin` (Platform management interface)

---

### COMPANY_ADMIN
**Company-level management** - Manages their own company

**Can:**
- ✅ Access company dashboard (`/company/dashboard`)
- ✅ View analytics for all their worksites
- ✅ Create, view, edit worksites within their company
- ✅ Invite users to their company
- ✅ Invite Site Admins, Supervisors, Workers, Viewers
- ✅ View all worksites belonging to their company
- ✅ Manage company-wide settings
- ✅ View team members across all worksites

**Cannot:**
- ❌ Access other companies' data
- ❌ Access super admin panel
- ❌ Delete the company
- ❌ Promote users to COMPANY_ADMIN

**Dashboard:** `/company/dashboard` → Worksite management, analytics, team

---

### SITE_ADMIN
**Worksite-level management** - Manages specific worksites

**Can:**
- ✅ Access worksite dashboard (`/dashboard`)
- ✅ View assigned worksites only
- ✅ Create and manage cameras for their worksites
- ✅ Invite Supervisors, Workers, Viewers to their worksite
- ✅ Acknowledge and resolve alerts
- ✅ Configure worksite settings
- ✅ View worksite analytics
- ✅ Manage workers on their worksite

**Cannot:**
- ❌ Access company dashboard
- ❌ Create new worksites
- ❌ Invite Company Admins or Site Admins
- ❌ View other worksites they're not assigned to
- ❌ Delete worksites

**Dashboard:** `/dashboard` → Worksite-specific view

---

### SUPERVISOR
**Alert management & monitoring** - Supervises worksite operations

**Can:**
- ✅ Access worksite dashboard
- ✅ View assigned worksites
- ✅ Acknowledge alerts
- ✅ Resolve alerts
- ✅ View camera feeds
- ✅ View safety reports
- ✅ Monitor workers

**Cannot:**
- ❌ Create or delete cameras
- ❌ Invite users
- ❌ Change worksite settings
- ❌ Delete alerts
- ❌ Access company dashboard

**Dashboard:** `/dashboard` → Monitoring and alert management

---

### WORKER
**Basic access** - View-only for their assigned worksites

**Can:**
- ✅ Access dashboard
- ✅ View assigned worksites
- ✅ View alerts (read-only)
- ✅ View camera feeds
- ✅ View their profile

**Cannot:**
- ❌ Acknowledge or resolve alerts
- ❌ Invite users
- ❌ Create cameras
- ❌ Change any settings
- ❌ Access company data

**Dashboard:** `/dashboard` → View-only mode

---

### VIEWER
**Read-only access** - External stakeholders, clients

**Can:**
- ✅ View dashboard
- ✅ View assigned worksites
- ✅ View safety reports
- ✅ View camera feeds (if granted)

**Cannot:**
- ❌ Acknowledge alerts
- ❌ Make any changes
- ❌ Invite users
- ❌ Access sensitive data

**Dashboard:** `/dashboard` → Read-only dashboard

---

## 🔐 Permission Matrix

| Action | SUPER_ADMIN | COMPANY_ADMIN | SITE_ADMIN | SUPERVISOR | WORKER | VIEWER |
|--------|-------------|---------------|------------|------------|--------|--------|
| **Companies** |
| View all companies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create company | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit any company | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit own company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete company | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Worksites** |
| View all worksites | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| View assigned worksites | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create worksite | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit worksite | ✅ | ✅ | ✅** | ❌ | ❌ | ❌ |
| Delete worksite | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Cameras** |
| Create camera | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit camera | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete camera | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View camera feeds | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Alerts** |
| View alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acknowledge alerts | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Resolve alerts | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete alerts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users** |
| Invite COMPANY_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite SITE_ADMIN | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite SUPERVISOR | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite WORKER | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite VIEWER | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export audit logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Only their own company's worksites  
\** Only settings, not deletion

---

## 🚀 Implementation Details

### Permission Checking (Backend)

```typescript
import { canAcknowledgeAlerts, canManageWorksites, UserRole } from '@/app/lib/permissions';

// Example: Check if user can acknowledge alerts
if (!canAcknowledgeAlerts(user.role)) {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}
```

### Permission Checking (Frontend)

```typescript
import { usePermissions } from '@/app/hooks/usePermissions';

function MyComponent() {
  const { can } = usePermissions();

  return (
    <>
      {can('acknowledge-alerts') && (
        <button onClick={handleAcknowledge}>Acknowledge</button>
      )}
    </>
  );
}
```

### Role-Based Routing

**Middleware** (`app/middleware.ts`):
- Automatically redirects users based on role after login
- `SUPER_ADMIN` → `/admin`
- `COMPANY_ADMIN` → `/company/dashboard`
- Others → `/dashboard`

### Access Control

**Worksite Access:**
- Managed via `WorksiteUser` join table
- Users can be assigned to multiple worksites
- Permission is checked on every API call

**Company Access:**
- Managed via `CompanyUser` join table
- Users belong to one primary company
- Can be granted access to specific worksites

---

## 📊 User Onboarding Flow

### 1. SUPER_ADMIN Creates Company
```
SUPER_ADMIN logs in → Admin Panel → Create Company
→ Invites COMPANY_ADMIN via email
```

### 2. COMPANY_ADMIN Claims Account
```
Receives email → Clicks link → Sets password & profile
→ Agrees to ToS → Redirected to /company/dashboard
```

### 3. COMPANY_ADMIN Creates Worksite
```
Company Dashboard → Create Worksite
→ Invites SITE_ADMIN for that worksite
```

### 4. SITE_ADMIN Manages Worksite
```
Receives email → Claims account → Redirected to /dashboard
→ Sees only assigned worksite → Invites Workers
```

### 5. WORKER Joins
```
Receives email → Claims account → View-only dashboard
```

---

## 🔍 Data Isolation

### Database Level
- Every query filters by `companyId` or `worksiteId`
- User's `companyId` is stored in session
- WorksiteUser relation determines worksite access

### API Level
- Session validation on every request
- Permission check before data access
- Audit logging for all critical actions

### UI Level
- Role badges show user's permission level
- Disabled buttons for restricted actions
- Hidden menu items based on permissions

---

## 🛠️ Adding New Permissions

### 1. Define in `lib/permissions.ts`
```typescript
export function canDoNewAction(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}
```

### 2. Add to usePermissions hook
```typescript
const permissions = {
  'do-new-action': canDoNewAction(userRole),
};
```

### 3. Protect API Route
```typescript
if (!canDoNewAction(user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 4. Conditionally Render UI
```typescript
{can('do-new-action') && <Button>New Action</Button>}
```

---

## 🎯 Best Practices

1. **Always check permissions server-side** - Never trust the client
2. **Use the permission utilities** - Don't hardcode role strings
3. **Log sensitive actions** - Use audit logger for compliance
4. **Fail securely** - Default to deny if unsure
5. **Test with each role** - Ensure proper access control

---

## 📞 Questions?

- **Implementation**: See `app/lib/permissions.ts`
- **Examples**: Check `app/api/alerts/[id]/route.ts`
- **Database Schema**: See `prisma/schema.prisma`
- **Role Assignment**: See `app/admin/companies/[id]/page.tsx`

**This system is production-ready with comprehensive RBAC! 🎉**

