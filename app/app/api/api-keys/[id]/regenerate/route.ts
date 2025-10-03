import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { ApiKeyManager } from '../../../../lib/api-key-manager';
import { prisma } from '../../../../lib/prisma';

// POST /api/api-keys/[id]/regenerate - Regenerate API key
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await ApiKeyManager.regenerateApiKey(params.id, session.user.id);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Get the updated API key with the new key
    const updatedApiKey = await prisma.apiKey.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedApiKey,
      message: 'API key regenerated successfully',
    });

  } catch (error) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate API key' },
      { status: 500 }
    );
  }
}
