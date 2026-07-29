/**
 * GET  /api/alert-contacts?worksiteId=...   — list contacts for a worksite
 * POST /api/alert-contacts                  — create a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const worksiteId = new URL(request.url).searchParams.get('worksiteId');
  if (!worksiteId) return NextResponse.json({ error: 'worksiteId required' }, { status: 400 });

  const contacts = await prisma.alertContact.findMany({
    where: { worksiteId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, data: contacts });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { worksiteId, name, email, phone } = body;

  if (!worksiteId || !name || (!email && !phone)) {
    return NextResponse.json({ error: 'worksiteId, name, and at least one of email/phone required' }, { status: 400 });
  }

  const contact = await prisma.alertContact.create({
    data: { worksiteId, name, email: email || null, phone: phone || '' },
  });

  return NextResponse.json({ success: true, data: contact }, { status: 201 });
}
