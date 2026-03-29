import { NextRequest, NextResponse } from 'next/server';
import { getCachedSession } from '@/app/lib/session-cache';
import { prisma } from '@/app/lib/prisma';
import { createAlertSchema, alertQuerySchema } from '@/app/lib/validation/alerts';
import { validateBody, validateQuery } from '@/app/lib/validation/common';
import { AlertSeverity } from '@prisma/client';

// Map severity values to AlertSeverity enum
function mapSeverityToEnum(severity: string): AlertSeverity {
  const upper = severity.toUpperCase();
  if (upper === 'LOW' || upper === 'INFO') return 'INFO';
  if (upper === 'MEDIUM' || upper === 'WARNING') return 'WARNING';
  if (upper === 'HIGH' || upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'EMERGENCY') return 'EMERGENCY';
  return 'INFO'; // Default
}

export async function GET(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[Alerts API] [${requestId}] ========== START REQUEST ==========`);
  console.log(`[Alerts API] [${requestId}] Request URL:`, request.url);
  console.log(`[Alerts API] [${requestId}] Request method:`, request.method);
  try {
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log(`[Alerts API] [${requestId}] Request headers:`, headersObj);
  } catch (headerError: any) {
    console.log(`[Alerts API] [${requestId}] Could not log headers:`, headerError?.message);
  }
  
  try {
    console.log(`[Alerts API] [${requestId}] Step 1: Starting authentication check...`);
    let session;
    try {
      session = await getCachedSession(request);
      console.log(`[Alerts API] [${requestId}] Step 1.1: getCachedSession completed`);
      console.log(`[Alerts API] [${requestId}] Session exists:`, !!session);
      console.log(`[Alerts API] [${requestId}] Session user:`, session?.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      } : null);
    } catch (authError: any) {
      console.error(`[Alerts API] [${requestId}] ❌ AUTH ERROR:`, {
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
      console.log(`[Alerts API] [${requestId}] ❌ No session or user ID`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[Alerts API] [${requestId}] Step 2: Parsing URL parameters...`);
    const { searchParams } = new URL(request.url);
    console.log(`[Alerts API] [${requestId}] Raw searchParams:`, Object.fromEntries(searchParams.entries()));
    
    // Handle status parameter separately to support comma-separated values
    const rawStatus = searchParams.get('status');
    const statusParam = rawStatus ? rawStatus.toUpperCase() : undefined;
    console.log(`[Alerts API] [${requestId}] Raw status param:`, rawStatus);
    console.log(`[Alerts API] [${requestId}] Processed status param:`, statusParam);
    
    // Create a modified searchParams for validation (without status)
    const modifiedParams = new URLSearchParams(searchParams);
    if (rawStatus) {
      modifiedParams.delete('status');
    }
    console.log(`[Alerts API] [${requestId}] Modified params for validation:`, Object.fromEntries(modifiedParams.entries()));
    
    console.log(`[Alerts API] [${requestId}] Step 3: Validating query parameters...`);
    const validation = validateQuery(alertQuerySchema, modifiedParams);
    console.log(`[Alerts API] [${requestId}] Validation result:`, {
      success: validation.success,
      errors: validation.success ? null : validation.error.errors
    });

    if (!validation.success) {
      console.error(`[Alerts API] [${requestId}] ❌ VALIDATION FAILED:`, {
        errors: validation.error.errors,
        formatted: JSON.stringify(validation.error.errors, null, 2)
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    console.log(`[Alerts API] [${requestId}] Step 4: Extracting validated parameters...`);
    const { 
      limit, 
      offset, 
      worksiteId, 
      severity, 
      source, 
      startDate, 
      endDate,
    } = validation.data;
    
    console.log(`[Alerts API] [${requestId}] Validated parameters:`, {
      limit,
      offset,
      worksiteId,
      severity,
      source,
      startDate,
      endDate,
      statusParam
    });
    
    // Use the separately parsed status
    const status = statusParam;

    console.log(`[Alerts API] [${requestId}] Step 5: Building where clause...`);
    const where: any = {};

    if (worksiteId) {
      where.worksiteId = worksiteId;
      console.log(`[Alerts API] [${requestId}] Added worksiteId to where:`, worksiteId);
    }
    if (severity) {
      // Ensure severity is uppercase to match enum
      where.severity = severity.toUpperCase();
      console.log(`[Alerts API] [${requestId}] Added severity to where:`, where.severity);
    }
    if (status) {
      console.log(`[Alerts API] [${requestId}] Processing status:`, status);
      // Handle comma-separated status values like "ACTIVE,ACKNOWLEDGED" or single status
      const statusArray = status.includes(',') 
        ? status.split(',').map(s => s.trim().toUpperCase())
        : [status.toUpperCase()];
      console.log(`[Alerts API] [${requestId}] Status array:`, statusArray);
      
      // Validate status values against AlertStatus enum
      const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED'];
      const filteredStatuses = statusArray.filter(s => validStatuses.includes(s));
      console.log(`[Alerts API] [${requestId}] Valid statuses:`, validStatuses);
      console.log(`[Alerts API] [${requestId}] Filtered statuses:`, filteredStatuses);
      
      if (filteredStatuses.length > 0) {
        where.status = { in: filteredStatuses };
        console.log(`[Alerts API] [${requestId}] Added status filter to where:`, where.status);
      } else {
        console.log(`[Alerts API] [${requestId}] ⚠️ No valid statuses found, returning empty result`);
        // If no valid statuses, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          total: 0,
          limit,
          offset,
        });
      }
    }
    if (source) {
      where.source = source;
      console.log(`[Alerts API] [${requestId}] Added source to where:`, source);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        try {
          where.createdAt.gte = new Date(startDate);
          console.log(`[Alerts API] [${requestId}] Added startDate to where:`, where.createdAt.gte);
        } catch (e: any) {
          console.error(`[Alerts API] [${requestId}] ❌ Invalid startDate:`, startDate, e?.message);
        }
      }
      if (endDate) {
        try {
          where.createdAt.lte = new Date(endDate);
          console.log(`[Alerts API] [${requestId}] Added endDate to where:`, where.createdAt.lte);
        } catch (e: any) {
          console.error(`[Alerts API] [${requestId}] ❌ Invalid endDate:`, endDate, e?.message);
        }
      }
    }
    
    console.log(`[Alerts API] [${requestId}] Final where clause:`, JSON.stringify(where, null, 2));

    console.log(`[Alerts API] [${requestId}] Step 6: Checking Prisma client...`);
    // Check if Prisma client has the model
    if (typeof prisma.alert === 'undefined') {
      console.error(`[Alerts API] [${requestId}] ❌ Alert model not found in Prisma client!`);
      const availableModels = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
      console.error(`[Alerts API] [${requestId}] Available Prisma models:`, availableModels);
      return NextResponse.json(
        { 
          success: false,
          error: 'Database model not available',
          details: 'Alert model is missing from Prisma client. Please restart the server after running: npx prisma generate',
        },
        { status: 500 }
      );
    }
    console.log(`[Alerts API] [${requestId}] Prisma alert model exists:`, typeof prisma.alert);

    // Fetch all matching alerts
    let allAlerts: any[] = [];
    const queryStartTime = Date.now();
    try {
      console.log(`[Alerts API] [${requestId}] Step 7: Executing Prisma query with where clause...`);
      console.log(`[Alerts API] [${requestId}] Where clause (stringified):`, JSON.stringify(where, null, 2));
      console.log(`[Alerts API] [${requestId}] Where clause (object):`, where);
      
      // Try with includes first, but fallback to basic query if relations fail
      try {
        console.log(`[Alerts API] [${requestId}] Step 7.1: Attempting query with relations (rule, worksite)...`);
        // Use select instead of include to avoid selecting overrideStatus which doesn't exist in DB
        const queryOptions: any = {
          where,
          orderBy: { createdAt: 'desc' as const },
          select: {
            id: true,
            title: true,
            description: true,
            severity: true,
            status: true,
            source: true,
            location: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            ruleId: true,
            worksiteId: true,
            cameraId: true,
            detectionSnapshot: true,
            // Explicitly exclude overrideStatus and related fields that don't exist in DB
            rule: {
              select: { name: true, description: true, severity: true }
            },
            worksite: {
              select: { id: true, name: true, worksiteName: true }
            },
            camera: {
              select: { id: true, name: true, location: true }
            }
          }
        };
        
        console.log(`[Alerts API] [${requestId}] Query options:`, JSON.stringify(queryOptions, null, 2));
        
        allAlerts = await prisma.alert.findMany(queryOptions);
        
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[Alerts API] [${requestId}] ✅ Query succeeded in ${queryDuration}ms`);
        console.log(`[Alerts API] [${requestId}] Found ${allAlerts.length} alerts`);
        if (allAlerts.length > 0) {
          console.log(`[Alerts API] [${requestId}] First alert sample:`, {
            id: allAlerts[0].id,
            title: allAlerts[0].title,
            status: allAlerts[0].status,
            severity: allAlerts[0].severity,
            hasRule: !!(allAlerts[0] as any).rule,
            hasWorksite: !!(allAlerts[0] as any).worksite
          });
        }
      } catch (includeError: any) {
        console.warn(`[Alerts API] [${requestId}] ⚠️ Query with relations failed, trying without relations...`);
        console.error(`[Alerts API] [${requestId}] Include error details:`, {
          message: includeError?.message,
          name: includeError?.name,
          code: includeError?.code,
          meta: includeError?.meta,
          stack: includeError?.stack?.split('\n').slice(0, 10).join('\n')
        });
        
        // Fallback to basic query without relations
        console.log(`[Alerts API] [${requestId}] Step 7.2: Attempting query without relations...`);
        const basicQueryOptions: any = {
          where,
          orderBy: { createdAt: 'desc' as const },
          // Explicitly select fields to avoid overrideStatus which doesn't exist
          select: {
            id: true,
            title: true,
            description: true,
            severity: true,
            status: true,
            source: true,
            location: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            ruleId: true,
            worksiteId: true,
            detectionSnapshot: true,
            // Don't select overrideStatus - it doesn't exist in the schema
          }
        };
        console.log(`[Alerts API] [${requestId}] Basic query options:`, JSON.stringify(basicQueryOptions, null, 2));
        
        try {
        allAlerts = await prisma.alert.findMany(basicQueryOptions);
        
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[Alerts API] [${requestId}] ✅ Basic query succeeded in ${queryDuration}ms`);
        console.log(`[Alerts API] [${requestId}] Found ${allAlerts.length} alerts (without relations)`);
        } catch (basicQueryError: any) {
          console.error(`[Alerts API] [${requestId}] ❌ Basic query also failed:`, basicQueryError?.message);
          // Return empty array instead of error to prevent 500
          allAlerts = [];
        }
      }
    } catch (prismaError: any) {
      const queryDuration = Date.now() - queryStartTime;
      console.error(`[Alerts API] [${requestId}] ❌ PRISMA QUERY ERROR after ${queryDuration}ms:`);
      console.error(`[Alerts API] [${requestId}] Error message:`, prismaError?.message);
      console.error(`[Alerts API] [${requestId}] Error name:`, prismaError?.name);
      console.error(`[Alerts API] [${requestId}] Error code:`, prismaError?.code);
      console.error(`[Alerts API] [${requestId}] Error meta:`, JSON.stringify(prismaError?.meta, null, 2));
      console.error(`[Alerts API] [${requestId}] Error cause:`, prismaError?.cause);
      if (prismaError?.stack) {
        console.error(`[Alerts API] [${requestId}] Error stack (first 15 lines):`, prismaError.stack.split('\n').slice(0, 15).join('\n'));
      }
      console.error(`[Alerts API] [${requestId}] Where clause that caused error:`, JSON.stringify(where, null, 2));
      console.error(`[Alerts API] [${requestId}] Prisma client type:`, typeof prisma);
      console.error(`[Alerts API] [${requestId}] Prisma.alert type:`, typeof prisma.alert);
      console.error(`[Alerts API] [${requestId}] Prisma.alert.findMany type:`, typeof prisma.alert?.findMany);
      
      // Return a more helpful error message
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch alerts',
          details: prismaError?.message || 'Database query failed',
          code: prismaError?.code,
          name: prismaError?.name,
          meta: prismaError?.meta,
        },
        { status: 500 }
      );
    }

    console.log(`[Alerts API] [${requestId}] Step 8: Processing results...`);
    // No need to filter by confidence - that field doesn't exist in the Alert model
    let filteredAlerts = allAlerts;
    console.log(`[Alerts API] [${requestId}] Filtered alerts count:`, filteredAlerts.length);

    // Apply pagination after filtering
    const total = filteredAlerts.length;
    const alerts = filteredAlerts.slice(offset || 0, (offset || 0) + (limit || 100));
    console.log(`[Alerts API] [${requestId}] Pagination:`, {
      total,
      offset,
      limit,
      returned: alerts.length
    });

    const totalDuration = Date.now() - requestStartTime;
    console.log(`[Alerts API] [${requestId}] ✅ SUCCESS - Returning ${alerts.length} alerts (total: ${total}) in ${totalDuration}ms`);
    console.log(`[Alerts API] [${requestId}] ========== END REQUEST ==========`);

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[Alerts API] [${requestId}] ❌ TOP-LEVEL ERROR after ${totalDuration}ms:`);
    console.error(`[Alerts API] [${requestId}] Error message:`, error?.message);
    console.error(`[Alerts API] [${requestId}] Error name:`, error?.name);
    console.error(`[Alerts API] [${requestId}] Error code:`, error?.code);
    console.error(`[Alerts API] [${requestId}] Error meta:`, JSON.stringify(error?.meta, null, 2));
    console.error(`[Alerts API] [${requestId}] Error cause:`, error?.cause);
    if (error?.stack) {
      console.error(`[Alerts API] [${requestId}] Error stack (first 20 lines):`, error.stack.split('\n').slice(0, 20).join('\n'));
    }
    console.error(`[Alerts API] [${requestId}] Full error object:`, JSON.stringify({
      message: error?.message,
      code: error?.code,
      name: error?.name,
      meta: error?.meta,
      cause: error?.cause,
    }, null, 2));
    console.error(`[Alerts API] [${requestId}] ========== END REQUEST (ERROR) ==========`);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch alerts',
        details: error?.message || 'Unknown error',
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        // Include helpful debugging info
        debug: process.env.NODE_ENV === 'development' ? {
          hasAlert: typeof prisma.alert !== 'undefined',
          prismaModels: Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).slice(0, 10),
        } : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[Alerts API POST] [${requestId}] ========== START REQUEST ==========`);
  console.log(`[Alerts API POST] [${requestId}] Request URL:`, request.url);
  
  try {
    console.log(`[Alerts API POST] [${requestId}] Step 1: Checking authentication...`);
    const session = await getCachedSession(request);
    console.log(`[Alerts API POST] [${requestId}] Session:`, session?.user ? {
      id: session.user.id,
      email: session.user.email
    } : null);
    
    if (!session?.user?.id) {
      console.log(`[Alerts API POST] [${requestId}] ❌ Unauthorized - no session or user ID`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[Alerts API POST] [${requestId}] Step 2: Parsing request body...`);
    const body = await request.json();
    console.log(`[Alerts API POST] [${requestId}] Request body:`, JSON.stringify(body, null, 2));
    
    console.log(`[Alerts API POST] [${requestId}] Step 3: Validating body...`);
    const validation = validateBody(createAlertSchema, body);
    console.log(`[Alerts API POST] [${requestId}] Validation result:`, {
      success: validation.success,
      errors: validation.success ? null : validation.error.errors
    });

    if (!validation.success) {
      console.error(`[Alerts API POST] [${requestId}] ❌ Validation failed:`, validation.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    console.log(`[Alerts API POST] [${requestId}] Step 4: Validated data:`, JSON.stringify(data, null, 2));
    
    console.log(`[Alerts API POST] [${requestId}] Step 5: Creating alert in database...`);
    const createStartTime = Date.now();
    const createData = {
      title: data.title,
      description: data.description || '',
      severity: mapSeverityToEnum(data.severity),
      status: 'ACTIVE' as const,
      source: data.source || 'MANUAL',
      location: data.location || null,
      metadata: data.metadata || {},
      ruleId: data.ruleId || null,
      worksiteId: data.worksiteId || null,
    };
    console.log(`[Alerts API POST] [${requestId}] Create data:`, JSON.stringify(createData, null, 2));
    
    const alert = await prisma.alert.create({
      data: createData
    });
    
    const createDuration = Date.now() - createStartTime;
    console.log(`[Alerts API POST] [${requestId}] ✅ Alert created in ${createDuration}ms:`, {
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      worksiteId: alert.worksiteId
    });

    console.log(`[Alerts API POST] [${requestId}] Step 6: Checking if workflow automation needed...`);
    // Trigger workflow automation ONLY for AI-detected alerts (not manual ones)
    const isAIDetected = alert.source === 'camera' || alert.source === 'ai' || alert.source === 'detection' || alert.detectionData;
    console.log(`[Alerts API POST] [${requestId}] Is AI detected:`, isAIDetected, 'Source:', alert.source);
    
    if (alert.worksiteId && isAIDetected) {
      console.log(`[Alerts API POST] [${requestId}] Triggering workflow automation...`);
      // Import dynamically to avoid circular dependencies
      import('@/app/lib/workflows/alert-processor').then(({ alertProcessor }) => {
        alertProcessor.processNewAlert(alert.id).catch(error => {
          console.error(`[Alerts API POST] [${requestId}] Workflow processing failed:`, error);
        });
      }).catch(error => {
        console.error(`[Alerts API POST] [${requestId}] Failed to load workflow processor:`, error);
      });
    } else {
      console.log(`[Alerts API POST] [${requestId}] Manual alert - skipping workflow automation`);
    }

    const totalDuration = Date.now() - requestStartTime;
    console.log(`[Alerts API POST] [${requestId}] ✅ SUCCESS - Alert created in ${totalDuration}ms`);
    console.log(`[Alerts API POST] [${requestId}] ========== END REQUEST ==========`);

    return NextResponse.json({
      success: true,
      data: alert,
      message: 'Alert created successfully',
    }, { status: 201 });
  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[Alerts API POST] [${requestId}] ❌ ERROR after ${totalDuration}ms:`);
    console.error(`[Alerts API POST] [${requestId}] Error message:`, error?.message);
    console.error(`[Alerts API POST] [${requestId}] Error name:`, error?.name);
    console.error(`[Alerts API POST] [${requestId}] Error code:`, error?.code);
    console.error(`[Alerts API POST] [${requestId}] Error meta:`, JSON.stringify(error?.meta, null, 2));
    console.error(`[Alerts API POST] [${requestId}] Error stack:`, error?.stack?.split('\n').slice(0, 15).join('\n'));
    console.error(`[Alerts API POST] [${requestId}] ========== END REQUEST (ERROR) ==========`);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create alert',
        details: error?.message || 'Unknown error',
        code: error?.code,
        name: error?.name,
        meta: error?.meta
      },
      { status: 500 }
    );
  }
}
