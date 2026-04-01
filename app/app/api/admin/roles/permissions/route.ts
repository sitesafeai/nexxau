import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';

/**
 * GET /api/admin/roles/permissions
 * Get role permission matrix
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Define permissions matrix
    const permissions = {
      SUPER_ADMIN: {
        companies: { view: true, create: true, update: true, delete: true },
        worksites: { view: true, create: true, update: true, delete: true },
        cameras: { view: true, create: true, update: true, delete: true },
        users: { view: true, create: true, update: true, delete: true, invite: true },
        alerts: { view: true, create: true, update: true, delete: true, acknowledge: true, resolve: true },
        reports: { view: true, export: true },
        billing: { view: true, create: true, update: true, delete: true },
        settings: { view: true, update: true },
        audit: { view: true },
      },
      COMPANY_ADMIN: {
        companies: { view: true, create: false, update: true, delete: false },
        worksites: { view: true, create: true, update: true, delete: false },
        cameras: { view: true, create: true, update: true, delete: false },
        users: { view: true, create: false, update: true, delete: false, invite: true },
        alerts: { view: true, create: false, update: false, delete: false, acknowledge: true, resolve: true },
        reports: { view: true, export: true },
        billing: { view: true, create: false, update: false, delete: false },
        settings: { view: true, update: true },
        audit: { view: false },
      },
      SITE_ADMIN: {
        companies: { view: false, create: false, update: false, delete: false },
        worksites: { view: true, create: false, update: true, delete: false },
        cameras: { view: true, create: true, update: true, delete: false },
        users: { view: true, create: false, update: false, delete: false, invite: false },
        alerts: { view: true, create: false, update: false, delete: false, acknowledge: true, resolve: true },
        reports: { view: true, export: true },
        billing: { view: false, create: false, update: false, delete: false },
        settings: { view: true, update: true },
        audit: { view: false },
      },
      SUPERVISOR: {
        companies: { view: false, create: false, update: false, delete: false },
        worksites: { view: true, create: false, update: false, delete: false },
        cameras: { view: true, create: false, update: false, delete: false },
        users: { view: false, create: false, update: false, delete: false, invite: false },
        alerts: { view: true, create: false, update: false, delete: false, acknowledge: true, resolve: false },
        reports: { view: true, export: false },
        billing: { view: false, create: false, update: false, delete: false },
        settings: { view: false, update: false },
        audit: { view: false },
      },
      WORKER: {
        companies: { view: false, create: false, update: false, delete: false },
        worksites: { view: true, create: false, update: false, delete: false },
        cameras: { view: true, create: false, update: false, delete: false },
        users: { view: false, create: false, update: false, delete: false, invite: false },
        alerts: { view: true, create: false, update: false, delete: false, acknowledge: false, resolve: false },
        reports: { view: false, export: false },
        billing: { view: false, create: false, update: false, delete: false },
        settings: { view: false, update: false },
        audit: { view: false },
      },
      VIEWER: {
        companies: { view: false, create: false, update: false, delete: false },
        worksites: { view: true, create: false, update: false, delete: false },
        cameras: { view: true, create: false, update: false, delete: false },
        users: { view: false, create: false, update: false, delete: false, invite: false },
        alerts: { view: true, create: false, update: false, delete: false, acknowledge: false, resolve: false },
        reports: { view: false, export: false },
        billing: { view: false, create: false, update: false, delete: false },
        settings: { view: false, update: false },
        audit: { view: false },
      },
    };

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    console.error('[admin][roles][permissions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch role permissions',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

