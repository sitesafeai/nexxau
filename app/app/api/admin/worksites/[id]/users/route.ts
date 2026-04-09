import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import { listUsersForSuperAdmin } from '@/app/lib/admin-user-queries';

/**
 * GET /api/admin/worksites/[id]/users
 * Users associated with a worksite (primary assignment or worksite access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: worksiteId } = await params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const data = await listUsersForSuperAdmin({ worksiteId, companyId });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][worksites][id][users] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch worksite users', details: message },
      { status: 500 }
    );
  }
}
