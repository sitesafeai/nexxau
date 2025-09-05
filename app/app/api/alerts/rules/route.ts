import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const rules = await prisma.alertRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Failed to fetch alert rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating alert rule with body:', body);
    
    // Validate required fields
    if (!body.name || !body.severity) {
      return NextResponse.json(
        { error: 'Name and severity are required' },
        { status: 400 }
      );
    }

    // Create the condition object with backward compatibility
    const condition = {
      camera: body.targetCameras?.length > 0 ? body.targetCameras[0] : 'All Cameras',
      threshold: body.condition?.threshold || 0.8,
      workflow: body.condition?.workflow || { nodes: [], connections: [] },
      category: body.category || 'PPE_COMPLIANCE',
      targetType: body.targetType || 'SITE_WIDE',
      targetZones: body.targetZones || [],
      targetCameras: body.targetCameras || [],
      targetWorkerRoles: body.targetWorkerRoles || [],
      // Include any additional condition data
      ...body.condition
    };

    console.log('Creating rule with condition:', condition);
    
    // Create the rule with only the fields that exist in the current schema
    const ruleData: any = {
      name: body.name,
      description: body.description || '',
      severity: body.severity.toUpperCase(), // Convert to enum value
      isActive: body.isActive !== false, // Default to true
      condition: condition
    };

    // Only add new fields if they exist in the schema
    if (body.category) {
      ruleData.category = body.category;
    }
    if (body.targetType) {
      ruleData.targetType = body.targetType;
    }
    if (body.targetZones) {
      ruleData.targetZones = body.targetZones;
    }
    if (body.targetCameras) {
      ruleData.targetCameras = body.targetCameras;
    }
    if (body.targetWorkerRoles) {
      ruleData.targetWorkerRoles = body.targetWorkerRoles;
    }
    if (body.actions) {
      ruleData.actions = body.actions;
    }
    if (body.escalationEnabled !== undefined) {
      ruleData.escalationEnabled = body.escalationEnabled;
    }
    if (body.escalationDelay) {
      ruleData.escalationDelay = body.escalationDelay;
    }
    if (body.escalationLevels) {
      ruleData.escalationLevels = body.escalationLevels;
    } else {
      ruleData.escalationLevels = []; // Default empty array
    }
    if (body.webhookUrl) {
      ruleData.webhookUrl = body.webhookUrl;
    }

    console.log('Final rule data:', ruleData);
    
    const rule = await prisma.alertRule.create({
      data: ruleData
    });

    console.log('Successfully created rule:', rule);
    return NextResponse.json(rule);
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to create alert rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

