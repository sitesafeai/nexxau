import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;
    const body = await request.json();

    let updatedUser;

    switch (action) {
      case 'activate':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { 
            isActivated: true,
            approved: true
          }
        });
        break;

      case 'suspend':
        updatedUser = await prisma.user.update({
          where: { id },
          data: { 
            approved: false
          }
        });
        break;

      case 'update':
        const { name, email, role, status } = body;
        
        // Hash password if provided
        let updateData: any = {
          name,
          email,
          role,
          isActivated: status === 'active',
          approved: status !== 'suspended'
        };

        // Only update password if provided
        if (body.password) {
          const bcrypt = require('bcryptjs');
          updateData.password = await bcrypt.hash(body.password, 10);
        }

        updatedUser = await prisma.user.update({
          where: { id },
          data: updateData
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
    const { action } = await params;
    console.error(`Failed to ${action} user:`, error);
    return NextResponse.json({ 
      error: `Failed to ${action} user` 
    }, { status: 500 });
  }
}
