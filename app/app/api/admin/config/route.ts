import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig, patchSystemConfig } from '@/app/lib/system-config-store';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function GET(request: NextRequest) {
  // Platform-wide settings: super admins only. Was open to anyone, read AND write.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  try {
    return NextResponse.json(getSystemConfig());
  } catch (error) {
    console.error('Failed to fetch system config:', error);
    return NextResponse.json({ error: 'Failed to fetch system config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Platform-wide settings: super admins only. Was open to anyone, read AND write.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  try {
    const body = await request.json();

    const systemConfig = patchSystemConfig(body);

    console.log('System configuration updated:', systemConfig);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: systemConfig
    });

  } catch (error) {
    console.error('Failed to update system config:', error);
    return NextResponse.json({ error: 'Failed to update system config' }, { status: 500 });
  }
}
