import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = `rules_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[Alert Rules API] [${requestId}] ========== START REQUEST ==========`);
  console.log(`[Alert Rules API] [${requestId}] Request URL:`, request.url);
  console.log(`[Alert Rules API] [${requestId}] Request method:`, request.method);
  
  try {
    console.log(`[Alert Rules API] [${requestId}] Step 1: Starting authentication check...`);
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log(`[Alert Rules API] [${requestId}] Step 1.1: getServerSession completed`);
      console.log(`[Alert Rules API] [${requestId}] Session exists:`, !!session);
      console.log(`[Alert Rules API] [${requestId}] Session user:`, session?.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      } : null);
    } catch (authError: any) {
      console.error(`[Alert Rules API] [${requestId}] ❌ AUTH ERROR:`, {
        message: authError?.message,
        name: authError?.name,
        code: authError?.code,
        stack: authError?.stack?.split('\n').slice(0, 5).join('\n')
      });
      return NextResponse.json(
        { success: false, error: 'Authentication failed', details: authError?.message },
        { status: 500 }
      );
    }
    
    if (!session?.user?.id) {
      console.log(`[Alert Rules API] [${requestId}] ❌ No session or user ID`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[Alert Rules API] [${requestId}] Step 2: Parsing URL parameters...`);
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    console.log(`[Alert Rules API] [${requestId}] Raw searchParams:`, Object.fromEntries(searchParams.entries()));
    console.log(`[Alert Rules API] [${requestId}] Extracted worksiteId:`, worksiteId);
    
    console.log(`[Alert Rules API] [${requestId}] Step 3: Building where clause...`);
    const where: any = {};
    if (worksiteId) {
      where.worksiteId = worksiteId;
      console.log(`[Alert Rules API] [${requestId}] Added worksiteId filter:`, worksiteId);
    } else {
      console.log(`[Alert Rules API] [${requestId}] No worksiteId filter - fetching all rules`);
    }
    console.log(`[Alert Rules API] [${requestId}] Final where clause:`, JSON.stringify(where, null, 2));
    
    console.log(`[Alert Rules API] [${requestId}] Step 4: Checking Prisma client...`);
    if (typeof prisma.alertRule === 'undefined') {
      console.error(`[Alert Rules API] [${requestId}] ❌ AlertRule model not found in Prisma client!`);
      const availableModels = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
      console.error(`[Alert Rules API] [${requestId}] Available Prisma models:`, availableModels);
      return NextResponse.json({
        success: false,
        error: 'Database model not available',
        details: 'AlertRule model is missing from Prisma client. Please restart the server after running: npx prisma generate',
      }, { status: 500 });
    }
    console.log(`[Alert Rules API] [${requestId}] Prisma alertRule model exists:`, typeof prisma.alertRule);
    
    console.log(`[Alert Rules API] [${requestId}] Step 5: Executing Prisma query...`);
    const queryStartTime = Date.now();
    const queryOptions = {
      where,
      orderBy: {
        createdAt: 'desc' as const
      },
      include: {
        worksite: {
          select: {
            id: true,
            name: true,
            worksiteName: true
          }
        }
      }
    };
    console.log(`[Alert Rules API] [${requestId}] Query options:`, JSON.stringify(queryOptions, null, 2));
    
    let alertRules;
    try {
      alertRules = await prisma.alertRule.findMany(queryOptions);
      const queryDuration = Date.now() - queryStartTime;
      console.log(`[Alert Rules API] [${requestId}] ✅ Query succeeded in ${queryDuration}ms`);
      console.log(`[Alert Rules API] [${requestId}] Found ${alertRules.length} alert rules`);
      if (alertRules.length > 0) {
        console.log(`[Alert Rules API] [${requestId}] First rule sample:`, {
          id: alertRules[0].id,
          name: alertRules[0].name,
          worksiteId: alertRules[0].worksiteId,
          hasWorksite: !!alertRules[0].worksite,
          isActive: alertRules[0].isActive
        });
      }
    } catch (queryError: any) {
      const queryDuration = Date.now() - queryStartTime;
      console.error(`[Alert Rules API] [${requestId}] ❌ PRISMA QUERY ERROR after ${queryDuration}ms:`);
      console.error(`[Alert Rules API] [${requestId}] Error message:`, queryError?.message);
      console.error(`[Alert Rules API] [${requestId}] Error name:`, queryError?.name);
      console.error(`[Alert Rules API] [${requestId}] Error code:`, queryError?.code);
      console.error(`[Alert Rules API] [${requestId}] Error meta:`, JSON.stringify(queryError?.meta, null, 2));
      console.error(`[Alert Rules API] [${requestId}] Error cause:`, queryError?.cause);
      if (queryError?.stack) {
        console.error(`[Alert Rules API] [${requestId}] Error stack (first 15 lines):`, queryError.stack.split('\n').slice(0, 15).join('\n'));
      }
      console.error(`[Alert Rules API] [${requestId}] Where clause that caused error:`, JSON.stringify(where, null, 2));
      throw queryError; // Re-throw to be caught by outer catch
    }

    const totalDuration = Date.now() - requestStartTime;
    console.log(`[Alert Rules API] [${requestId}] ✅ SUCCESS - Returning ${alertRules.length} rules in ${totalDuration}ms`);
    console.log(`[Alert Rules API] [${requestId}] ========== END REQUEST ==========`);

    return NextResponse.json({
      success: true,
      data: alertRules
    });
  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[Alert Rules API] [${requestId}] ❌ TOP-LEVEL ERROR after ${totalDuration}ms:`);
    console.error(`[Alert Rules API] [${requestId}] Error message:`, error?.message);
    console.error(`[Alert Rules API] [${requestId}] Error name:`, error?.name);
    console.error(`[Alert Rules API] [${requestId}] Error code:`, error?.code);
    console.error(`[Alert Rules API] [${requestId}] Error meta:`, JSON.stringify(error?.meta, null, 2));
    console.error(`[Alert Rules API] [${requestId}] Error cause:`, error?.cause);
    if (error?.stack) {
      console.error(`[Alert Rules API] [${requestId}] Error stack (first 20 lines):`, error.stack.split('\n').slice(0, 20).join('\n'));
    }
    console.error(`[Alert Rules API] [${requestId}] Full error object:`, JSON.stringify({
      message: error?.message,
      code: error?.code,
      name: error?.name,
      meta: error?.meta,
      cause: error?.cause,
    }, null, 2));
    console.error(`[Alert Rules API] [${requestId}] ========== END REQUEST (ERROR) ==========`);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch alert rules',
      details: error?.message || 'Unknown error',
      code: error?.code,
      name: error?.name,
      meta: error?.meta
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, severity, conditions, actions, isActive = true } = body;

    const alertRule = await prisma.alertRule.create({
      data: {
        name,
        description: description || null,
        severity,
        condition: conditions || {}, // Using condition (singular) as per schema, default to empty object
        isActive: isActive !== undefined ? isActive : true,
        worksiteId: body.worksiteId || null,
        userId: body.userId || null
      }
    });

    return NextResponse.json(alertRule, { status: 201 });
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    return NextResponse.json({ error: 'Failed to create alert rule' }, { status: 500 });
  }
}