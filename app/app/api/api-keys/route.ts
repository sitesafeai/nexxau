import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { ApiKeyManager } from '../../lib/api-key-manager';
import { withApiKeyAuth } from '../../lib/api-key-middleware';

// GET /api/api-keys - Get user's API keys
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKeys = await ApiKeyManager.getUserApiKeys(session.user.id);
    const stats = await ApiKeyManager.getUsageStats(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        apiKeys,
        stats,
      },
    });

  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, permissions, rateLimit, expiresAt } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'Name and permissions are required' },
        { status: 400 }
      );
    }

    // Validate permissions structure
    if (!permissions.read || !permissions.write || !permissions.admin) {
      return NextResponse.json(
        { error: 'Invalid permissions structure' },
        { status: 400 }
      );
    }

    const apiKey = await ApiKeyManager.createApiKey({
      name,
      userId: session.user.id,
      permissions,
      rateLimit: rateLimit || 1000,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: apiKey,
    });

  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
