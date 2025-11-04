import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/admin/companies/:id
 * Get single company with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        worksites: {
          include: {
            _count: {
              select: {
                cameras: true,
                alerts: true,
                workers: true,
                worksiteUsers: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActivated: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            worksites: true,
            users: true,
            companyUsers: true
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company', details: error.message },
      { status: 500 }
    );
  } finally {
    // No disconnect needed with singleton
  }
}

/**
 * PATCH /api/admin/companies/:id
 * Update a company
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const company = await prisma.company.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({
      success: true,
      data: company
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company', details: error.message },
      { status: 500 }
    );
  } finally {
    // No disconnect needed with singleton
  }
}

/**
 * DELETE /api/admin/companies/:id
 * Delete a company
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.company.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete company', details: error.message },
      { status: 500 }
    );
  } finally {
    // No disconnect needed with singleton
  }
}

