# 🔧 Database Connection Fix Guide

## 🚨 **Current Issue:**
```
Error: P1011: Error opening a TLS connection: bad certificate format
```

This is a **Supabase Pooler + Prisma TLS compatibility issue**.

---

## ✅ **SOLUTION OPTIONS** (Pick One)

### **Option 1: Use Direct Connection (RECOMMENDED)**

Your `.env` already has `DIRECT_URL`, but Prisma might not be using it properly.

**Update your `prisma/schema.prisma`:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DIRECT_URL")    // ← Change from DATABASE_URL to DIRECT_URL
  directUrl = env("DIRECT_URL")
  relationMode = "prisma"
}
```

**Then run:**
```bash
cd /Users/luizcarneiro/nexxau/app
npx prisma generate
npx prisma db push
```

---

### **Option 2: Modify Connection String**

Update your `.env` file:

**From:**
```env
DATABASE_URL=postgresql://postgres.REDACTED:REDACTED@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**To (add sslaccept=strict):**
```env
DATABASE_URL=postgresql://postgres.REDACTED:REDACTED@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require&sslaccept=strict
```

---

### **Option 3: Bypass Pooler Entirely**

Use only the direct connection:

**Update `.env`:**
```env
# Comment out the pooler URL
# DATABASE_URL=postgresql://postgres.REDACTED...

# Use direct connection for everything
DATABASE_URL=postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=require
```

---

### **Option 4: Disable SSL (DEVELOPMENT ONLY)**

**⚠️ WARNING: Only use this for local development, NEVER in production!**

```env
DATABASE_URL=postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=disable
DIRECT_URL=postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=disable
```

---

## 🚀 **STEP-BY-STEP FIX**

### **Step 1: Update Schema (Option 1 - Recommended)**

```bash
cd /Users/luizcarneiro/nexxau/app
```

Edit `prisma/schema.prisma` line 3:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DIRECT_URL")    // ← Changed from DATABASE_URL
  directUrl = env("DIRECT_URL")
  relationMode = "prisma"
}
```

### **Step 2: Regenerate Prisma Client**

```bash
npx prisma generate
```

### **Step 3: Push Schema to Database**

```bash
npx prisma db push
```

You should see:
```
✔ Your database is now in sync with your Prisma schema
✔ Generated Prisma Client
```

### **Step 4: Verify Connection**

```bash
npx prisma studio
```

This should open at `http://localhost:5555` and show your database tables.

### **Step 5: Seed Data**

```bash
# Seed worksites
npx tsx scripts/seed-worksites.ts

# Seed cameras (if not already done)
npx tsx scripts/seed-cameras.ts
```

### **Step 6: Test in Browser**

```bash
npm run dev
```

Navigate to:
- `http://localhost:3000/dashboard` - Should show real data
- `http://localhost:3000/dashboard/analytics` - Should load without errors

---

## 🔍 **TROUBLESHOOTING**

### **Error 1: "bad certificate format"**
**Solution:** Use `DIRECT_URL` instead of pooler URL in schema.prisma

### **Error 2: "Can't reach database server"**
**Solution:** Check firewall, verify IP is whitelisted on Supabase

### **Error 3: "SSL connection error"**
**Solution:** Try adding `&sslaccept=strict` to connection string

### **Error 4: "Authentication failed"**
**Solution:** Verify password in `.env` is correct

---

## 🎯 **QUICK FIX (Do This Now):**

```bash
# 1. Navigate to your app directory
cd /Users/luizcarneiro/nexxau/app

# 2. Update your Prisma schema
# Edit prisma/schema.prisma, line 3:
# Change: url = env("DATABASE_URL")
# To:     url = env("DIRECT_URL")

# 3. Regenerate Prisma
npx prisma generate

# 4. Push to database
npx prisma db push

# 5. Open Prisma Studio to verify
npx prisma studio

# 6. If that works, seed your data:
npx tsx scripts/seed-worksites.ts
```

---

## 📊 **After Fix - What Will Work:**

- ✅ Analytics page with real data
- ✅ Safety scores calculated from database
- ✅ Real camera counts
- ✅ Real violation tracking
- ✅ Real alert statistics
- ✅ All API endpoints functional
- ✅ Seeded worksites available
- ✅ Complete production system

---

## 🆘 **Still Not Working?**

Try this alternative connection string format:

```env
# Supabase Direct Connection (Alternative Format)
DATABASE_URL="postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres"
```

Or check your Supabase dashboard for the correct connection strings:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → Database
4. Copy the "Connection String" (Direct connection)
5. Replace password with your actual password

---

**Let me know which option you want to try, or I can make the change for you!** 🚀

