import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * GET /api/auth/me
 * Get current user information
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      // For development, return a mock user
      // In production, this should return 401
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            id: 'dev-user-1',
            name: 'Development User',
            email: 'dev@nexxau.com',
            role: 'SUPER_ADMIN',
            image: null
          }
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session.user
    });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    
    // Fallback for development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        data: {
          id: 'dev-user-1',
          name: 'Development User',
          email: 'dev@nexxau.com',
          role: 'SUPER_ADMIN',
          image: null
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

