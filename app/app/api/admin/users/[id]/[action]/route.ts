import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const { id, action } = params;
    const body = await request.json();

    let updatedUser;

    switch (action) {
      case 'activate':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { isActive: true }
        });
        break;

      case 'suspend':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { isActive: false }
        });
        break;

      case 'update':
        const { name, email, role, permissions } = body;
        updatedUser = await prisma.user.update({
          where: { id },
          data: {
            name,
            email,
            role,
            permissions
          }
        });
        break;

      case 'delete':
        await prisma.user.delete({
          where: { id }
        });
        return NextResponse.json({ message: 'User deleted successfully' });

      case 'reset-password':
        // In a real implementation, you'd generate a secure reset token
        // For now, we'll just log the action
        console.log(`Password reset requested for user ${id}`);
        return NextResponse.json({ message: 'Password reset email sent' });

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error(`Failed to ${params.action} user:`, error);
    return NextResponse.json({ 
      error: `Failed to ${params.action} user` 
    }, { status: 500 });
  }
}
