import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { clearWorksiteSettingsCache } from '@/app/lib/worksite-settings';

/**
 * GET /api/worksites/:id
 * Get single worksite with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const worksite = await prisma.worksite.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyUsername: true
          }
        },
        cameras: true,
        workers: true,
        worksiteUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        alerts: {
          where: {
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
          }
        },
        _count: {
          select: {
            cameras: true,
            alerts: true,
            workers: true,
            worksiteUsers: true
          }
        }
      }
    });

    if (!worksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error fetching worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch worksite', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/worksites/:id
 * Update a worksite
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Check if the worksite exists
    const existingWorksite = await prisma.worksite.findUnique({
      where: { id: params.id }
    });

    if (!existingWorksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // If updating settings, store them in CameraSystemConfig
    if (body.settings) {
      const { settings, ...worksiteData } = body;

      // Update or create camera system config with settings
      await prisma.cameraSystemConfig.upsert({
        where: { worksiteId: params.id },
        update: { 
          config: settings
        },
        create: {
          worksiteId: params.id,
          config: settings
        }
      });

      // Update worksite if there's other data
      if (Object.keys(worksiteData).length > 0) {
        await prisma.worksite.update({
          where: { id: params.id },
          data: worksiteData
        });
      }
    } else {
      // Update worksite normally if no settings
      await prisma.worksite.update({
        where: { id: params.id },
        data: body
      });
    }

    // Fetch updated worksite with config
    const worksite = await prisma.worksite.findUnique({
      where: { id: params.id },
      include: {
        cameraSystemConfig: true
      }
    });

    // Clear settings cache so updated settings are loaded next time
    clearWorksiteSettingsCache(params.id);

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error updating worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update worksite', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worksites/:id
 * Delete a worksite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.worksite.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Worksite deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete worksite', details: error.message },
      { status: 500 }
    );
  }
}
