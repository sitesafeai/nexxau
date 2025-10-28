# 🔄 How to Restart Your Server

## **Quick Restart (Do This Now):**

### **Step 1: Stop the Server**
In your terminal where `npm run dev` is running:
```
Press: Ctrl + C
```

### **Step 2: Clean Build**
```bash
cd /Users/luizcarneiro/nexxau/app
rm -rf .next
npx prisma generate
```

### **Step 3: Start Server**
```bash
npm run dev
```

### **Step 4: Wait for Compilation**
You'll see:
```
✓ Ready in 5s
○ Compiling /dashboard ...
✓ Compiled /dashboard in 3s
```

### **Step 5: Test in Browser**
```
http://localhost:3001/dashboard
```

---

## **What This Fixes:**

- ✅ Regenerates Prisma client with new schema
- ✅ Clears Next.js cache
- ✅ Recompiles all API routes
- ✅ Loads updated .env variables
- ✅ Initializes database connections

---

## **After Restart, Verify:**

### **1. Check API Endpoints:**
```bash
# Auth should work:
curl http://localhost:3001/api/auth/me
# Should return: {"success":true,"data":{...}}

# Worksites should work:
curl http://localhost:3001/api/worksites
# Should return: {"success":true,"data":[...3 worksites...]}

# Analytics should work:
curl "http://localhost:3001/api/analytics?worksiteId=<ID>&timeRange=7d"
# Should return real data
```

### **2. Open Browser:**
```
✅ Dashboard: http://localhost:3001/dashboard
✅ Analytics: http://localhost:3001/dashboard/analytics
✅ Settings: http://localhost:3001/dashboard/settings?site=1
```

---

## **If Still Not Working:**

### **Option A: Nuclear Reset**
```bash
cd /Users/luizcarneiro/nexxau/app

# Stop server (Ctrl+C)

# Clean everything
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache

# Regenerate
npx prisma generate

# Restart
npm run dev
```

### **Option B: Check Server Logs**
Look at the terminal running `npm run dev` for error messages.

### **Option C: Verify Database**
```bash
npx prisma studio
```
This opens at `http://localhost:5555` and lets you browse your database.

---

## **Expected Result:**

After restart, your dashboard will show:

```
✅ 3 Worksites in dropdown
✅ Real camera counts
✅ Real alert counts  
✅ Real safety scores
✅ 65 violations in analytics
✅ Real hourly charts
✅ No API errors in console
```

---

**Just do Step 1-5 above and everything will work!** 🚀

