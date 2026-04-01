import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { clearWorksiteSettingsCache } from '@/app/lib/worksite-settings';

/**
 * GET /api/worksites/:id
 * Get single worksite with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Use explicit select to avoid non-existent columns
    const worksite = await prisma.worksite.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        worksiteName: true,
        location: true,
        address: true,
        companyId: true,
        cameraSystemType: true,
        status: true,
        // isActive: true, // NOT IN DATABASE YET
        // timezone: true, // NOT IN DATABASE YET
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            companyUsername: true
          }
        },
        cameras: {
          select: {
            id: true,
            name: true,
            status: true,
            location: true,
            streamUrl: true,
            janusFeedId: true,
            metadata: true
          }
        },
        workers: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        worksiteUsers: {
          select: {
            id: true,
            role: true,
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
          },
          select: {
            id: true,
            description: true,
            severity: true,
            status: true,
            createdAt: true
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
    console.error('[GET /api/worksites/:id] Error fetching worksite:', error);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('[PATCH /api/worksites/:id] Updating worksite:', id, 'with data:', body);

    // Sanitize body to only include fields that exist in the database
    // Remove schema fields that may not be migrated yet
    const { 
      slug, 
      addressDetails, 
      industry, 
      businessUnit, 
      retentionPolicy, 
      dataResidency, 
      operatingHours, 
      sitePlanUrl, 
      sitePlanTiles, 
      cameraPins, 
      contactName, 
      contactEmail, 
      contactPhone,
      settings,
      ...safeData 
    } = body;

    // Check if the worksite exists
    const existingWorksite = await prisma.worksite.findFirst({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingWorksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    console.log('[PATCH /api/worksites/:id] Sanitized data:', safeData);

    // If updating settings, store them in CameraSystemConfig
    if (settings) {
      // Update or create camera system config with settings
      await prisma.cameraSystemConfig.upsert({
        where: { worksiteId: id },
        update: { 
          config: settings
        },
        create: {
          worksiteId: id,
          config: settings
        }
      });

      // Update worksite if there's other data
      if (Object.keys(safeData).length > 0) {
        await prisma.worksite.update({
          where: { id },
          data: safeData
        });
      }
    } else if (Object.keys(safeData).length > 0) {
      // Update worksite normally with safe data only
      await prisma.worksite.update({
        where: { id },
        data: safeData
      });
    }

    // Fetch updated worksite with explicit field selection (only fields that exist in DB)
    const worksite = await prisma.worksite.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        worksiteName: true,
        location: true,
        address: true,
        companyId: true,
        cameraSystemType: true,
        status: true,
        // isActive: true, // NOT IN DATABASE YET
        // timezone: true, // NOT IN DATABASE YET
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            companyUsername: true
          }
        },
        cameraSystemConfig: {
          select: {
            id: true,
            config: true
          }
        },
        _count: {
          select: {
            cameras: true,
            alerts: true,
            workers: true
          }
        }
      }
    });

    // Clear settings cache so updated settings are loaded next time
    clearWorksiteSettingsCache(id);

    console.log('[PATCH /api/worksites/:id] Successfully updated worksite');

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('[PATCH /api/worksites/:id] Error updating worksite:', error);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.worksite.delete({
      where: { id }
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
