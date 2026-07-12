import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { ApiKeyManager } from '../../../lib/api-key-manager';
import { prisma } from '../../../lib/prisma';

// PUT /api/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, permissions, rateLimit, expiresAt, isActive } = body;

    // Update API key
    const updatedApiKey = await prisma.apiKey.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions }),
        ...(rateLimit && { rateLimit }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (updatedApiKey.count === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
    });

  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/[id] - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Capture name before revocation
    const keyRecord = await prisma.apiKey.findFirst({ where: { id, userId: session.user.id }, select: { name: true } }).catch(() => null);

    const result = await ApiKeyManager.revokeApiKey(id, session.user.id);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Audit log
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'API_KEY_REVOKED',
        entity: 'SYSTEM',
        entityId: id,
        metadata: {
          entityName: keyRecord?.name || id,
          severity: 'WARNING',
          result: 'SUCCESS',
          details: null,
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });

  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
