import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { checkRole } from '@/app/lib/api-helpers';

// GET /api/admin/inquiries - Get all contact inquiries
export async function GET(request: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError: any) {
      console.error('[Inquiries API] Auth error:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication failed', details: authError?.message },
        { status: 500 }
      );
    }
    
    if (!session?.user) {
      console.error('[Inquiries API] No session found');
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource.',
        },
        { status: 401 }
      );
    }
    
    // Check if user has required role
    const roleCheck = checkRole(session.user.role, 'SUPER_ADMIN', 'access this page');
    if (roleCheck) {
      console.error('[Inquiries API] User role check failed:', session.user.role);
      return roleCheck;
    }
    
    console.log('[Inquiries API] Session validated, user:', session.user.id, 'role:', session.user.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const isReadParam = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) {
      // Validate status is a valid InquiryStatus enum value
      const validStatuses = ['UNREAD', 'READ', 'REPLIED', 'RESOLVED', 'ARCHIVED'];
      if (validStatuses.includes(status)) {
      where.status = status;
    }
    }
    if (isReadParam !== null && isReadParam !== undefined) {
      where.isRead = isReadParam === 'true';
    }

    // Check if Prisma client has the model
    if (typeof prisma.contactInquiry === 'undefined') {
      console.error('[Inquiries API] ❌ ContactInquiry model not found in Prisma client!');
      console.error('[Inquiries API] Prisma client models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
      return NextResponse.json(
        { 
          success: false,
          error: 'Database model not available',
          details: 'ContactInquiry model is missing from Prisma client. Please restart the server after running: npx prisma generate',
        },
        { status: 500 }
      );
    }

    let inquiries, total;
    try {
      [inquiries, total] = await Promise.all([
      prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contactInquiry.count({ where }),
    ]);
    } catch (dbError: any) {
      console.error('[Inquiries API] Database error:', dbError);
      console.error('[Inquiries API] Error message:', dbError?.message);
      console.error('[Inquiries API] Error code:', dbError?.code);
      console.error('[Inquiries API] Error name:', dbError?.name);
      if (dbError?.meta) {
        console.error('[Inquiries API] Error meta:', JSON.stringify(dbError.meta, null, 2));
      }
      console.error('[Inquiries API] Where clause:', JSON.stringify(where, null, 2));
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      data: inquiries,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Inquiries API] Error fetching inquiries:', error);
    console.error('[Inquiries API] Full error:', JSON.stringify({
      message: error?.message,
      code: error?.code,
      name: error?.name,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 5),
    }, null, 2));
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch inquiries',
        details: error?.message || 'Unknown error',
        code: error?.code,
        name: error?.name,
        meta: error?.meta,
        // Include helpful debugging info
        debug: process.env.NODE_ENV === 'development' ? {
          hasContactInquiry: typeof prisma.contactInquiry !== 'undefined',
          prismaModels: Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).slice(0, 10),
        } : undefined,
      },
      { status: 500 }
    );
  }
}
