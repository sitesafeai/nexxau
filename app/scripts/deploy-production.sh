#!/bin/bash

# Production Deployment Script for Nexxau
# This script automates the deployment process

set -e

echo "🚀 Deploying Nexxau to Production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo "Please create .env.production from env.production.template first."
    exit 1
fi

# Load environment variables
source .env.production

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Environment: $NODE_ENV"
echo "App URL: $NEXT_PUBLIC_APP_URL"

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing production dependencies...${NC}"
npm ci --only=production

# Step 2: Build application
echo -e "${YELLOW}🏗️ Building application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 3: Test production build
echo -e "${YELLOW}🧪 Testing production build...${NC}"
timeout 30s npm start &
START_PID=$!

# Wait for server to start
sleep 10

# Test if server is responding
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Production build test successful!${NC}"
    kill $START_PID 2>/dev/null || true
else
    echo -e "${RED}❌ Production build test failed!${NC}"
    kill $START_PID 2>/dev/null || true
    exit 1
fi

# Step 4: Deploy to Vercel (if available)
if command -v vercel &> /dev/null; then
    echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
    read -p "Do you want to deploy to Vercel now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel --prod
        echo -e "${GREEN}✅ Vercel deployment complete!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Vercel CLI not found. Install with: npm i -g vercel${NC}"
fi

# Step 5: Deploy to Firebase (if available)
if command -v firebase &> /dev/null; then
    echo -e "${YELLOW}🔥 Deploying to Firebase...${NC}"
    read -p "Do you want to deploy to Firebase now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        firebase deploy
        echo -e "${GREEN}✅ Firebase deployment complete!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Firebase CLI not found. Install with: npm i -g firebase-tools${NC}"
fi

# Step 6: Health check
echo -e "${YELLOW}🔍 Running health checks...${NC}"

# Check if build artifacts exist
if [ -d ".next" ]; then
    echo -e "${GREEN}✅ Build artifacts found${NC}"
else
    echo -e "${RED}❌ Build artifacts missing${NC}"
fi

# Check environment variables
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo -e "${GREEN}✅ $var is set${NC}"
    else
        echo -e "${RED}❌ $var is missing${NC}"
    fi
done

echo -e "${GREEN}🎉 Deployment process complete!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Configure environment variables in your deployment platform"
echo "2. Set up monitoring and alerts"
echo "3. Test all features in production"
echo "4. Set up backup schedules"
echo "5. Document deployment process"

echo -e "${YELLOW}📚 For detailed instructions, see DEPLOYMENT.md${NC}" 