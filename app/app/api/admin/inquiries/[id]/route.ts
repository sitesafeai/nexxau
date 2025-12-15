import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// PATCH /api/admin/inquiries/[id] - Update inquiry status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, isRead, notes, assignedTo } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (isRead !== undefined) updateData.isRead = isRead;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    // Set repliedAt if status is REPLIED
    if (status === 'REPLIED' && !updateData.repliedAt) {
      updateData.repliedAt = new Date();
    }

    // Set resolvedAt if status is RESOLVED
    if (status === 'RESOLVED' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const inquiry = await prisma.contactInquiry.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to update inquiry' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/inquiries/[id] - Delete inquiry (archive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Instead of deleting, mark as archived
    const inquiry = await prisma.contactInquiry.update({
      where: { id: params.id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('Error archiving inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to archive inquiry' },
      { status: 500 }
    );
  }
}
