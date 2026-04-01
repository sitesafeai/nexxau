import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';
import { validateRtspStream } from '@/lib/rtsp-validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const userRole = normalizeRole(session.user.role);
    const canValidate =
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'SITE_ADMIN' ||
      userRole === 'SAFETY_MANAGER';

    if (!canValidate) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[API /cameras/validate] Failed to parse request body:', parseError);
      return NextResponse.json(
        { ok: false, error: 'invalid_request', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { rtspUrl } = body || {};

    if (!rtspUrl || typeof rtspUrl !== 'string' || !rtspUrl.trim()) {
      return NextResponse.json(
        { ok: false, error: 'invalid_url', message: 'RTSP URL is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log('[API /cameras/validate] Validating RTSP URL:', rtspUrl.substring(0, 50) + '...');
    const result = await validateRtspStream(rtspUrl.trim());
    
    if (!result.ok) {
      console.error('[API /cameras/validate] Validation failed:', {
        error: result.error,
        message: result.message,
        rtspUrl: rtspUrl.substring(0, 50) + '...',
      });
      return NextResponse.json(result, { status: 400 });
    }

    console.log('[API /cameras/validate] Validation successful:', {
      codec: result.stream?.codec,
      resolution: `${result.stream?.width}x${result.stream?.height}`,
      fps: result.stream?.fps,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API /cameras/validate] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
