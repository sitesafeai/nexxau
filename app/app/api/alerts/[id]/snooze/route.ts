import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// POST /api/alerts/[id]/snooze - Snooze an alert
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alertId = params.id;
    const body = await request.json();
    const { duration, notes } = body; // duration in minutes

    if (!duration || duration < 1) {
      return NextResponse.json(
        { error: 'Valid snooze duration is required' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const snoozeUntil = new Date(Date.now() + duration * 60 * 1000);

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'SNOOZED',
        snoozeUntil,
        resolutionType: 'SNOOZED',
        resolutionNotes: notes,
        resolvedBy: user.id,
      }
    });

    // Log the snooze action
    await prisma.alertResolutionLog.create({
      data: {
        alertId,
        userId: user.id,
        status: 'SNOOZED',
        notes,
        duration: duration * 60, // store in seconds
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedAlert,
      snoozeUntil: snoozeUntil.toISOString(),
      message: `Alert snoozed until ${snoozeUntil.toLocaleString()}`
    });

  } catch (error: any) {
    console.error('Error snoozing alert:', error);
    return NextResponse.json(
      { error: 'Failed to snooze alert', details: error.message },
      { status: 500 }
    );
  }
}

