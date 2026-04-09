import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import { listUsersForSuperAdmin } from '@/app/lib/admin-user-queries';

/**
 * GET /api/admin/companies/[id]/users
 * Users associated with a company (same rules as /api/admin/users?companyId=)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: companyId } = await params;
    const data = await listUsersForSuperAdmin({ companyId });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][companies][id][users] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company users', details: message },
      { status: 500 }
    );
  }
}
