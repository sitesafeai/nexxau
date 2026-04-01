/**
 * GET /api/cameras/:id/rules - List rules for a camera
 * POST /api/cameras/:id/rules - Create a custom rule
 * PATCH /api/cameras/:id/rules - Enable/disable a rule (body: { ruleId, enabled, disabledReason })
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: cameraId } = await params;
  const rules = await prisma.cameraRule.findMany({
    where: { cameraId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(rules);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: cameraId } = await params;
  const body = await req.json();
  const rule = await prisma.cameraRule.create({
    data: {
      ...body,
      cameraId,
      isPredefined: false,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ruleId, enabled, disabledReason } = await req.json();
  if (!ruleId) {
    return NextResponse.json({ error: 'ruleId required' }, { status: 400 });
  }

  const rule = await prisma.cameraRule.findUnique({ where: { id: ruleId } });
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  if (rule.isPredefined && enabled === false && !disabledReason?.trim()) {
    return NextResponse.json(
      { error: 'A reason is required to disable a predefined rule' },
      { status: 400 }
    );
  }

  const updated = await prisma.cameraRule.update({
    where: { id: ruleId },
    data: {
      enabled: enabled ?? rule.enabled,
      disabledReason: enabled ? null : disabledReason ?? rule.disabledReason,
    },
  });
  return NextResponse.json(updated);
}
