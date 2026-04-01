/**
 * POST /api/debug/send-test-email
 * Debug endpoint to test email sending functionality
 * 
 * In development: No auth required
 * In production: Admin-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { sendInvitationEmail } from '@/app/lib/email-service';

// Hardcoded developer email for testing
const TEST_EMAIL = process.env.DEBUG_TEST_EMAIL || 'test@example.com';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  try {
    // In production, require admin authentication
    if (IS_PRODUCTION) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const userRole = normalizeRole(session.user.role);
      const isAdmin = userRole === 'SUPER_ADMIN' || 
                      userRole === 'ADMIN' || 
                      userRole === 'COMPANY_ADMIN';

      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    console.log('[DEBUG EMAIL] ========================================');
    console.log('[DEBUG EMAIL] TEST EMAIL SEND REQUEST');
    console.log('[DEBUG EMAIL] ========================================');
    console.log('[DEBUG EMAIL] Test recipient:', TEST_EMAIL);
    console.log('[DEBUG EMAIL] Environment:', IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('[DEBUG EMAIL] Timestamp:', new Date().toISOString());

    // Send test invitation email
    const result = await sendInvitationEmail(
      TEST_EMAIL,
      'Debug System',
      'VIEWER',
      'Test Worksite',
      'test-token-' + Date.now(),
      'Test Company',
      'test-company-id',
      'test-worksite-id'
    );

    if (result.success) {
      console.log('[DEBUG EMAIL] ✅ Test email sent successfully');
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${TEST_EMAIL}`,
        recipient: TEST_EMAIL
      });
    } else {
      console.error('[DEBUG EMAIL] ❌ Test email failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Unknown error',
        errorDetails: result.errorDetails,
        recipient: TEST_EMAIL
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[DEBUG EMAIL] ❌ Exception in test email endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
      recipient: TEST_EMAIL
    }, { status: 500 });
  }
}

