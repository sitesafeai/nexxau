# 🚀 Nexxau Authentication System - Setup Guide

## Quick Start

### 1. Environment Setup
```bash
# Copy the environment file
cp env.local.example .env.local

# Edit .env.local and update the secrets
# Generate a secure secret: openssl rand -base64 32
```

### 2. Database Setup
```bash
# Install dependencies (if not already done)
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with test data
curl -X POST http://localhost:3000/api/seed
```

### 3. Start Development Server
```bash
npm run dev
```

## Test Credentials

### Admin Access
- **URL:** http://localhost:3000/admin
- **Email:** admin@nexxau.com
- **Password:** admin123

### Account Claiming Test
1. Go to http://localhost:3000/login
2. Click "Claim Account" tab
3. Use these credentials:
   - **Company Username:** buildsafeinc
   - **Worksite Name:** downtown-site-a
   - **Email:** john.smith@buildsafeinc.com (or any test worker)
   - **Password:** (choose your password)

### Test Workers Available
- **Site Manager:** john.smith@buildsafeinc.com
- **Worker:** sarah.johnson@buildsafeinc.com
- **Worker:** mike.davis@buildsafeinc.com
- **Viewer:** lisa.wilson@buildsafeinc.com

## Features to Test

### Admin Dashboard
- Create companies
- Add worksites
- Assign workers
- View worker claiming status

### Authentication Flow
- Login with existing accounts
- Claim new worker accounts
- Role-based access control
- Session management

### Database Relationships
- Company → Worksites → Workers
- User accounts linked to companies/worksites
- Role-based permissions

## Troubleshooting

### Common Issues

1. **SessionProvider Error**
   - Make sure SessionProviderWrapper is properly imported in layout.tsx

2. **Database Connection Error**
   - Check DATABASE_URL in .env.local
   - Ensure Prisma migrations are up to date

3. **Authentication Errors**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your local setup

4. **Seed Data Not Working**
   - Ensure database is migrated
   - Check API route is accessible

### Development Commands
```bash
# Reset database
npx prisma migrate reset

# View database
npx prisma studio

# Generate new migration
npx prisma migrate dev --name "migration_name"

# Push schema changes (development only)
npx prisma db push
```

## Next Steps

1. **Test the authentication flow** end-to-end
2. **Create test companies and worksites** via admin dashboard
3. **Test account claiming** with new workers
4. **Verify role-based access** works correctly
5. **Connect dashboard to real user data** (next phase)

## Security Notes

- Change default secrets in production
- Use strong passwords for admin accounts
- Enable HTTPS in production
- Set up proper email verification
- Implement rate limiting
- Add CSRF protection 