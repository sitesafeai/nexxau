import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      include: {
        worksites: {
          include: {
            workers: true
          }
        }
      }
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, companyUsername, email, phone, address } = await request.json();

    // Validate required fields
    if (!name || !companyUsername || !email) {
      return NextResponse.json(
        { error: 'Name, company username, and email are required' },
        { status: 400 }
      );
    }

    // Check if company username already exists
    const existingCompany = await prisma.company.findUnique({
      where: { companyUsername }
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company username already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.company.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name,
        companyUsername,
        email,
        phone,
        address
      },
      include: {
        worksites: {
          include: {
            workers: true
          }
        }
      }
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 