# ⚡ Quick Start Guide - Get Your Server Running

## 🚨 **DO THIS NOW** (In Your Terminal):

### **Step 1: Stop Everything**
```bash
# Press Ctrl+C in the terminal running npm run dev
# Or run:
pkill -9 node
```

### **Step 2: Fix File Limit (MacOS Issue)**
```bash
cd /Users/luizcarneiro/nexxau/app
ulimit -n 65536
```

### **Step 3: Clean Build**
```bash
rm -rf .next
rm -rf node_modules/.cache
npx prisma generate
```

### **Step 4: Start Server**
```bash
npm run dev
```

### **Step 5: Wait for "Ready"**
You should see:
```
✓ Ready in 5s
○ Compiling / ...
```

### **Step 6: Open Browser**
```
http://localhost:3001/dashboard
```

---

## ✅ **What You Should See:**

**Worksite Dropdown:**
```
📍 Downtown Construction Site
📍 Industrial Warehouse  
📍 Highway Bridge Project
```

**Dashboard:**
```
🏆 Safety Score Card
📊 Real camera counts
🔔 Real alert counts
📹 Live camera feeds
```

---

## 🔧 **If Worksite Dropdown is Empty:**

### **Quick Test:**
```bash
# Open a NEW terminal and run:
curl http://localhost:3001/api/worksites
```

**Should return:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Downtown Construction Site",
      "cameras": 2,
      "alerts": 2,
      ...
    },
    ...
  ]
}
```

**If you get an error**, check the terminal running `npm run dev` for error messages.

---

## 🐛 **Common Issues:**

### **Issue 1: "EMFILE: too many open files"**
**Fix:**
```bash
ulimit -n 65536
```

### **Issue 2: "AlertStatus ENUM error"**
**Fix:** Already fixed in latest code! Just restart.

### **Issue 3: "Prisma client not initialized"**
**Fix:**
```bash
npx prisma generate
rm -rf .next
npm run dev
```

### **Issue 4: "Port 3001 already in use"**
**Fix:**
```bash
lsof -ti:3001 | xargs kill -9
npm run dev
```

---

## 📋 **Complete Restart Checklist:**

```bash
# 1. Navigate to app directory
cd /Users/luizcarneiro/nexxau/app

# 2. Stop server (Ctrl+C or:)
pkill node

# 3. Increase file limit
ulimit -n 65536

# 4. Clean and regenerate
rm -rf .next
npx prisma generate

# 5. Start server
npm run dev

# 6. Wait for "Ready in Xs"

# 7. Open browser
http://localhost:3001/dashboard
```

---

## ✅ **Success Indicators:**

When everything works, you'll see:

**Terminal:**
```
✓ Ready in 5s
○ Compiling /dashboard ...
✓ Compiled /dashboard in 2s
○ Compiling /api/worksites ...
✓ Compiled /api/worksites in 500ms
```

**Browser Console:**
```
✅ GET /api/auth/me 200
✅ GET /api/worksites 200  
✅ 📹 Loaded 5 cameras from API
```

**Dashboard:**
```
✅ Worksite dropdown shows 3 sites
✅ Safety Score Card displays
✅ No red errors
```

---

## 🆘 **Still Not Working?**

Run this diagnostic:
```bash
cd /Users/luizcarneiro/nexxau/app

# Check database connection:
npx prisma studio
# Opens at http://localhost:5555
# You should see tables with data

# Check if worksites exist:
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.worksite.findMany().then(ws => {
  console.log('Worksites:', ws.length);
  ws.forEach(w => console.log('  -', w.name));
  process.exit(0);
});
"
```

---

**Just follow Steps 1-7 above and it will work!** 🚀
