import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { frameData, cameraId, timestamp } = await request.json();

    // Get camera to find its worksite
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: { worksite: true }
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Get all active alert rules for this worksite
    const rules = await prisma.alertRule.findMany({
      where: {
        isActive: true,
        worksiteId: camera.worksiteId
      }
    });

    const detections: any[] = [];
    const alerts: any[] = [];

    // Process each rule
    for (const rule of rules) {
      const condition = rule.condition as any;
      
      // Check if detection matches rule criteria
      if (await checkRuleCondition(frameData, condition)) {
        // Create alert
        const alert = await prisma.alert.create({
          data: {
            title: `Rule "${rule.name}" triggered`,
            description: `Rule "${rule.name}" triggered`,
            severity: rule.severity,
            status: 'ACTIVE',
            source: 'camera',
            location: camera.location || camera.name,
            metadata: {
              confidence: frameData.confidence,
              detectedObjects: frameData.objects,
              timestamp: timestamp,
              cameraId: cameraId,
              cameraName: camera.name
            },
            ruleId: rule.id,
            worksiteId: camera.worksiteId
          }
        });

        alerts.push(alert);

        // Execute workflow actions
        await executeWorkflowActions(rule, alert, frameData);
      }
    }

    return NextResponse.json({
      success: true,
      detections,
      alerts: alerts.length,
      rulesProcessed: rules.length
    });

  } catch (error) {
    console.error('YOLO processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process frame' },
      { status: 500 }
    );
  }
}

async function checkRuleCondition(frameData: any, condition: any): Promise<boolean> {
  const { category, subject, mode, threshold } = condition;
  
  // Check confidence threshold
  if (frameData.confidence < threshold) {
    return false;
  }

  // Check category-specific conditions
  switch (category) {
    case 'ppe':
      return checkPPECondition(frameData, subject, mode);
    case 'object':
      return checkObjectCondition(frameData, subject, mode);
    case 'behavior':
      return checkBehaviorCondition(frameData, subject, mode);
    case 'zone':
      return checkZoneCondition(frameData, subject, mode);
    default:
      return false;
  }
}

function checkPPECondition(frameData: any, subject: string, mode: string): boolean {
  const objects = frameData.objects || [];
  const hasPPE = objects.some((obj: any) => 
    obj.class === subject && obj.confidence > 0.5
  );
  
  return mode === 'presence' ? hasPPE : !hasPPE;
}

function checkObjectCondition(frameData: any, subject: string, mode: string): boolean {
  const objects = frameData.objects || [];
  const hasObject = objects.some((obj: any) => 
    obj.class === subject && obj.confidence > 0.5
  );
  
  return mode === 'presence' ? hasObject : !hasObject;
}

function checkBehaviorCondition(frameData: any, subject: string, mode: string): boolean {
  if (subject === 'speed') {
    const speed = frameData.metadata?.speed || 0;
    const speedLimit = frameData.metadata?.speedLimit || 10;
    return mode === 'presence' ? speed > speedLimit : speed <= speedLimit;
  }
  
  // Add other behavior checks as needed
  return false;
}

function checkZoneCondition(frameData: any, subject: string, mode: string): boolean {
  const inZone = frameData.metadata?.inZone || false;
  return mode === 'presence' ? inZone : !inZone;
}

async function executeWorkflowActions(rule: any, alert: any, frameData: any) {
  const workflow = rule.condition?.workflow || { nodes: [], connections: [] };
  
  // Execute workflow nodes in order
  for (const node of workflow.nodes) {
    if (node.type === 'action') {
      await executeAction(node, alert, frameData);
    }
  }
}

async function executeAction(node: any, alert: any, frameData: any) {
  const config = node.config || {};
  
  switch (node.title) {
    case 'Send Alert':
      await sendNotification(config.notification, config.recipients, alert);
      break;
    case 'Record Video':
      await startRecording(alert.metadata?.cameraId, config.duration);
      break;
    case 'Send SMS':
      await sendSMS(config.recipients, alert.description);
      break;
    default:
      console.log(`Unknown action: ${node.title}`);
  }
}

async function sendNotification(type: string, recipients: string[], alert: any) {
  // Implement notification logic
  console.log(`Sending ${type} notification to ${recipients.join(', ')} for alert ${alert.id}`);
}

async function startRecording(cameraId: string, duration: number) {
  // Implement video recording logic
  console.log(`Starting recording for camera ${cameraId} for ${duration} seconds`);
}

async function sendSMS(recipients: string[], message: string) {
  // Implement SMS logic using Twilio
  console.log(`Sending SMS to ${recipients.join(', ')}: ${message}`);
}
