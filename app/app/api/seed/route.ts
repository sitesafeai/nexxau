import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Only allow seeding in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Seeding not allowed in production' }, { status: 403 });
    }

    // Clear existing data
    await prisma.user.deleteMany();
    await prisma.worker.deleteMany();
    await prisma.worksite.deleteMany();
    await prisma.company.deleteMany();

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'BuildSafe Construction Inc.',
        companyUsername: 'buildsafeinc',
        email: 'admin@buildsafeinc.com',
        phone: '+1-555-0123',
        address: '123 Construction Ave, Building City, BC 12345'
      }
    });

    // Create test worksite
    const worksite = await prisma.worksite.create({
      data: {
        name: 'Downtown Office Tower',
        worksiteName: 'downtown-site-a',
        address: '456 Main Street, Downtown, BC 12345',
        cameraSystemType: 'advanced',
        companyId: company.id
      }
    });

    // Create test workers
    const workers = await Promise.all([
      prisma.worker.create({
        data: {
          name: 'John Smith',
          email: 'john.smith@buildsafeinc.com',
          role: 'site-manager',
          worksiteId: worksite.id,
          isClaimed: false
        }
      }),
      prisma.worker.create({
        data: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@buildsafeinc.com',
          role: 'worker',
          worksiteId: worksite.id,
          isClaimed: false
        }
      }),
      prisma.worker.create({
        data: {
          name: 'Mike Davis',
          email: 'mike.davis@buildsafeinc.com',
          role: 'worker',
          worksiteId: worksite.id,
          isClaimed: false
        }
      }),
      prisma.worker.create({
        data: {
          name: 'Lisa Wilson',
          email: 'lisa.wilson@buildsafeinc.com',
          role: 'viewer',
          worksiteId: worksite.id,
          isClaimed: false
        }
      })
    ]);

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@nexxau.com',
        password: hashedPassword,
        role: 'admin',
        isActivated: true,
        approved: true
      }
    });

    return NextResponse.json({
      message: 'Database seeded successfully',
      data: {
        company,
        worksite,
        workers,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role
        }
      }
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 