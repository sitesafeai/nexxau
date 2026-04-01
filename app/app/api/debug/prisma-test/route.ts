import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Debug endpoint to test Prisma client and database connectivity
 * Access: http://localhost:3000/api/debug/prisma-test
 * No auth required - for debugging only
 */
export async function GET() {
  // No auth check - this is a debug endpoint
  const results: any = {
    timestamp: new Date().toISOString(),
    prismaClient: {},
    database: {},
    errors: [],
  };

  try {
    // Test 1: Check if Prisma client has the models
    results.prismaClient.hasContactInquiry = typeof prisma.contactInquiry !== 'undefined';
    results.prismaClient.hasAlert = typeof prisma.alert !== 'undefined';
    results.prismaClient.hasUser = typeof prisma.user !== 'undefined';

    // Test 2: Try to query ContactInquiry
    try {
      const inquiryCount = await prisma.contactInquiry.count();
      results.database.contactInquiryCount = inquiryCount;
      results.database.contactInquiryWorks = true;
    } catch (error: any) {
      results.database.contactInquiryWorks = false;
      results.errors.push({
        test: 'ContactInquiry query',
        error: error.message,
        code: error.code,
        name: error.name,
      });
    }

    // Test 3: Try to query Alert with overrideStatus
    try {
      const alertCount = await prisma.alert.count({
        where: { overrideStatus: 'false_positive' },
      });
      results.database.alertWithOverrideStatusCount = alertCount;
      results.database.alertQueryWorks = true;
    } catch (error: any) {
      results.database.alertQueryWorks = false;
      results.errors.push({
        test: 'Alert query with overrideStatus',
        error: error.message,
        code: error.code,
        name: error.name,
      });
    }

    // Test 4: Try to query Alert with relations
    try {
      const testAlert = await prisma.alert.findFirst({
        include: {
          overrideByUser: true,
          worksite: true,
          camera: true,
        },
      });
      results.database.alertWithRelationsWorks = true;
      results.database.testAlertId = testAlert?.id || null;
    } catch (error: any) {
      results.database.alertWithRelationsWorks = false;
      results.errors.push({
        test: 'Alert query with relations',
        error: error.message,
        code: error.code,
        name: error.name,
        meta: error.meta,
      });
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.errors.push({
      test: 'General error',
      error: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5),
    });
    return NextResponse.json(results, { status: 500 });
  }
}
