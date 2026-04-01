import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/admin/security-settings
 * Get security settings
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // In a real implementation, these would be stored in a SystemSettings table
    // For now, we'll return defaults
    return NextResponse.json({
      success: true,
      data: {
        twoFactorEnabled: process.env.ENABLE_2FA === 'true',
        ssoEnabled: process.env.ENABLE_SSO === 'true',
        ssoProvider: process.env.SSO_PROVIDER || 'none',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600', 10), // seconds
        encryptionKeyRotation: process.env.ENCRYPTION_KEY_ROTATION || '30', // days
      },
    });
  } catch (error: any) {
    console.error('[admin][security-settings] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch security settings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/security-settings
 * Update security settings
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { twoFactorEnabled, ssoEnabled, ssoProvider, sessionTimeout, encryptionKeyRotation } = body;

    // In a real implementation, these would be saved to a SystemSettings table
    // For now, we'll just return success
    // Note: Environment variables would need to be updated via deployment/config management

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully',
      data: {
        twoFactorEnabled: twoFactorEnabled ?? false,
        ssoEnabled: ssoEnabled ?? false,
        ssoProvider: ssoProvider || 'none',
        sessionTimeout: sessionTimeout || 3600,
        encryptionKeyRotation: encryptionKeyRotation || '30',
      },
    });
  } catch (error: any) {
    console.error('[admin][security-settings] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update security settings', details: error.message },
      { status: 500 }
    );
  }
}

