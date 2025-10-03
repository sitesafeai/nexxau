#!/bin/bash

# Nexxau Test Setup Script
echo "🧪 Setting up Nexxau Test Environment..."

# Create test directories
mkdir -p __tests__/utils
mkdir -p __tests__/lib
mkdir -p __tests__/api
mkdir -p __tests__/components
mkdir -p __tests__/performance
mkdir -p __tests__/config
mkdir -p e2e
mkdir -p test-results
mkdir -p coverage

# Install Playwright browsers
echo "📦 Installing Playwright browsers..."
npx playwright install

# Create test database
echo "🗄️ Setting up test database..."
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
npx prisma migrate dev --name test_setup

# Generate Prisma client for tests
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run unit tests
echo "🧪 Running unit tests..."
npm run test:ci

# Run E2E tests
echo "🎭 Running E2E tests..."
npm run test:e2e

# Generate coverage report
echo "📊 Generating coverage report..."
npm run test:coverage

# Run performance tests
echo "⚡ Running performance tests..."
npm run test:performance

echo ""
echo "✅ Test setup complete!"
echo ""
echo "📊 Test Results:"
echo "  • Unit Tests: Check coverage/ directory"
echo "  • E2E Tests: Check test-results/ directory"
echo "  • Performance: Check test-results/performance/ directory"
echo ""
echo "🔧 Available test commands:"
echo "  • npm run test - Run unit tests"
echo "  • npm run test:watch - Run unit tests in watch mode"
echo "  • npm run test:coverage - Run unit tests with coverage"
echo "  • npm run test:e2e - Run E2E tests"
echo "  • npm run test:e2e:ui - Run E2E tests with UI"
echo "  • npm run test:e2e:headed - Run E2E tests in headed mode"
echo "  • npm run test:e2e:debug - Run E2E tests in debug mode"
echo "  • npm run test:all - Run all tests"
echo "  • npm run test:performance - Run performance tests"
echo ""
echo "📈 Coverage Thresholds:"
echo "  • Global: 70%"
echo "  • Critical Components: 90%"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review test coverage report"
echo "  2. Add tests for any uncovered code"
echo "  3. Set up CI/CD pipeline with tests"
echo "  4. Configure test notifications"
echo ""
