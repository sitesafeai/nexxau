#!/bin/bash

# Production Database Setup Script for Nexxau
# This script helps set up PostgreSQL and run migrations

set -e

echo "🚀 Setting up Production Database for Nexxau..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo "Please create .env.production from env.production.template first."
    exit 1
fi

# Load environment variables
source .env.production

echo -e "${YELLOW}📋 Current Configuration:${NC}"
echo "Database: $DATABASE_URL"
echo "Environment: $NODE_ENV"

# Check if PostgreSQL is accessible
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if ! npx prisma db pull --schema=./prisma/schema.production.prisma > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    echo "Please check your DATABASE_URL in .env.production"
    echo "Make sure PostgreSQL is running and accessible"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful!${NC}"

# Switch to production schema
echo -e "${YELLOW}🔄 Switching to production schema...${NC}"
cp prisma/schema.production.prisma prisma/schema.prisma

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Run migrations
echo -e "${YELLOW}📦 Running database migrations...${NC}"
npx prisma migrate deploy

# Seed the database (optional)
read -p "Do you want to seed the database with initial data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    npm run seed
fi

# Verify setup
echo -e "${YELLOW}🔍 Verifying database setup...${NC}"
npx prisma studio --port 5555 &
STUDIO_PID=$!

echo -e "${GREEN}✅ Production database setup complete!${NC}"
echo -e "${YELLOW}📊 Prisma Studio is running at http://localhost:5555${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop Prisma Studio${NC}"

# Wait for user to stop
wait $STUDIO_PID 