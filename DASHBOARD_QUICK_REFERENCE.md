# 🎮 Dashboard Quick Reference Guide

## 📍 **Where Everything Is Located**

### **1. Safety Score Card**
**Location:** Dashboard Overview Tab (top of page)
**URL:** `http://localhost:3000/dashboard`
**What it shows:**
- Today's safety score (0-100)
- Grade (A+ to F)
- Violations breakdown
- Recommendations
- Trends (yesterday, 7-day, 30-day averages)

---

## 🔘 **Quick Action Buttons (What They Do)**

### **1. 📊 Generate Report**
- **Goes to:** Reports Tab
- **URL:** `/dashboard?tab=reports`
- **What you can do:**
  - Export daily/weekly/monthly reports
  - Download incident reports
  - Download compliance reports
  - Download performance reports
  - All in PDF/CSV format

### **2. 🔔 View Active Alerts**
- **Goes to:** Alerts Page
- **URL:** `/dashboard/alerts`
- **What you can do:**
  - See all active alerts
  - View alert history
  - Acknowledge alerts
  - Resolve alerts
  - Filter by severity/status

### **3. 🎯 Custom Rules**
- **Goes to:** Custom Rules Page
- **URL:** `/dashboard/custom-rules`
- **What you can do:**
  - Create new detection rules
  - Draw zones on camera feeds
  - Choose what objects trigger alerts (person, forklift, etc.)
  - Set SMS/Email recipients
  - Edit existing rules
  - Enable/disable rules

### **4. 📹 Manage Cameras**
- **Goes to:** Camera Management Page
- **URL:** `/dashboard/camera-management`
- **What you can do:**
  - Add new camera feeds (HLS, RTSP, WebRTC)
  - Remove cameras
  - Edit camera settings
  - Test camera connections
  - View camera health

---

## 🆚 **Key Differences**

### **View Active Alerts vs Custom Rules:**

| Feature | View Active Alerts | Custom Rules |
|---------|-------------------|--------------|
| **Purpose** | Monitor what's alerting NOW | Define WHAT should alert |
| **Action** | View, acknowledge, resolve | Create, edit, delete rules |
| **Use Case** | "What's happening?" | "What should I watch for?" |
| **Example** | See "3 people without hardhats" | Create "Alert me if no hardhat detected" |

**In simple terms:**
- **View Active Alerts** = The fire alarm ringing 🚨
- **Custom Rules** = Setting up what triggers the alarm 🔧

---

## 🗺️ **Navigation Map**

```
Dashboard (/)
├── Overview Tab (default)
│   ├── Safety Score Card ⭐
│   ├── Key Metrics
│   ├── Quick Actions
│   └── Live Camera Feed
│
├── Monitoring Tab
│   └── Multiple camera views with pagination
│
├── Alerts Tab
│   └── Active alerts list
│
├── Reports Tab
│   └── Export buttons for different report types
│
└── Cameras Tab
    └── Camera grid with navigation

Subpages:
├── /dashboard/alerts           (View active alerts)
├── /dashboard/custom-rules     (Create/edit detection rules)
├── /dashboard/alert-builder    (Rule creation wizard)
├── /dashboard/camera-management (CRUD for cameras)
├── /dashboard/analytics        (⚠️ Under construction)
├── /dashboard/compliance       (⚠️ Under construction)
└── /dashboard/errors           (⚠️ Under construction)
```

---

## 🎯 **Common Workflows**

### **Workflow 1: Create a New Safety Rule**
```
1. Click "Custom Rules" button (purple)
2. Click "Create New Rule"
3. Fill in rule name & description
4. Choose detection type (e.g., "Zone Violation")
5. Draw zone on camera feed
6. Select trigger objects (forklift, person, etc.)
7. Add SMS/Email recipients
8. Set severity level
9. Review & Create
✅ Rule is now active and monitoring!
```

### **Workflow 2: Respond to an Alert**
```
1. Click "View Active Alerts" button (green)
2. See list of current alerts
3. Click on an alert to view details
4. Acknowledge the alert
5. Take corrective action
6. Mark as resolved
✅ Alert closed!
```

### **Workflow 3: Add a New Camera**
```
1. Click "Manage Cameras" button (violet)
2. Click "Add Camera"
3. Enter camera name
4. Enter HLS/RTSP URL
5. Optionally add location
6. Save
✅ Camera appears in monitoring!
```

### **Workflow 4: Generate a Report**
```
1. Click "Generate Report" button (blue)
2. Choose report type:
   - Daily/Weekly/Monthly
   - Incident Report
   - Compliance Report
   - Performance Report
3. Click "Export PDF" or "Export CSV"
✅ Report downloads!
```

---

## 🎨 **Button Color Guide**

- 🔵 **Blue** = Reports & Analytics
- 🟢 **Green** = Alerts & Monitoring
- 🟣 **Purple** = Rules & Configuration
- 🟣 **Violet** = Cameras & Hardware

---

## ⚡ **Keyboard Shortcuts (Future)**

Coming soon:
- `Ctrl+R` - Refresh safety score
- `Ctrl+A` - View alerts
- `Ctrl+N` - New custom rule
- `Ctrl+C` - Camera management

---

## 🔍 **Finding Specific Features**

### **"I want to set up a new alert"**
→ Click **Custom Rules** (purple button)

### **"I want to see what's currently alerting"**
→ Click **View Active Alerts** (green button)

### **"I want to add a camera"**
→ Click **Manage Cameras** (violet button)

### **"I want to download a report"**
→ Click **Generate Report** (blue button)

### **"I want to see today's safety score"**
→ Just look at the top of the dashboard! ⭐

---

## 🚨 **Troubleshooting**

### **Safety Score Card not showing:**
- Refresh the page
- Check browser console for errors
- Verify worksite ID is correct
- Try manually calculating via API

### **Button does nothing when clicked:**
- Check browser console for errors
- Verify you're logged in
- Clear browser cache
- Try hard refresh (Ctrl+Shift+R)

### **Page shows "Under Construction":**
- That feature is still being built!
- Check back later
- Use alternative pages (e.g., Reports Tab instead of Analytics)

---

## 📱 **Mobile Responsive**

All buttons and pages are mobile-friendly:
- Touch-friendly button sizes
- Responsive grid layouts
- Swipe navigation
- Collapsible sidebars

---

## 🎓 **Best Practices**

1. **Check Safety Score Daily** - Make it part of morning routine
2. **Review Active Alerts** - Don't let them pile up
3. **Create Specific Rules** - Be precise with zone drawing
4. **Test Before Deploying** - Use test cameras first
5. **Export Reports Weekly** - Build historical data
6. **Monitor Trends** - Look for patterns in violations
7. **Adjust Rules** - Fine-tune based on false positives

---

## 📞 **Need Help?**

- Check `SAFETY_SCORE_SYSTEM.md` for scoring details
- Check `CUSTOM_ALERTS_IMPLEMENTATION.md` for rules
- Check `HOW_TO_CREATE_ZONES.md` for zone drawing
- Check browser console for error messages
- Review API responses in Network tab

---

**Happy Monitoring! 🎉**

