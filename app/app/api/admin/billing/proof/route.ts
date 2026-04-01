import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/admin/billing/proof
 * Secure endpoint to fetch billing proof documents
 * Query params: recordId (billing record ID)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { role: true }
    });

    if (!user || (user.role?.toUpperCase() !== 'SUPER_ADMIN' && user.role?.toUpperCase() !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get recordId from query params
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'recordId is required' },
        { status: 400 }
      );
    }

    // Fetch billing record
    const record = await prisma.companyBillingRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        proofUrl: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!record || !record.proofUrl) {
      return NextResponse.json(
        { success: false, error: 'Billing record or proof not found' },
        { status: 404 }
      );
    }

    // If it's a Cloudinary URL, we need to handle it differently
    // Cloudinary URLs might need to be signed or accessed via their API
    const proofUrl = record.proofUrl;

    // For Cloudinary URLs, try to use the SDK to fetch the file directly
    // This works for both public and private resources
    if (proofUrl.includes('cloudinary.com') && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_SECRET) {
      try {
        const cloudinary = await import('cloudinary').catch(() => null);
        if (cloudinary) {
          cloudinary.v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
          });

          // Extract public_id from URL
          // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
          const urlMatch = proofUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
          if (urlMatch && urlMatch[1]) {
            const publicId = urlMatch[1].replace(/\.[^/.]+$/, ''); // Remove extension
            
            // Determine resource type from URL
            let resourceType: 'image' | 'video' | 'raw' = 'raw'; // Default to raw for PDFs
            if (proofUrl.includes('/image/upload/')) {
              resourceType = 'image';
            } else if (proofUrl.includes('/video/upload/')) {
              resourceType = 'video';
            }
            
            // Use Cloudinary API to get the file content (works for private resources too)
            // For raw resources (PDFs), we can use the secure_url directly or generate a signed URL
            const fileUrl = cloudinary.v2.url(publicId, {
              resource_type: resourceType,
              secure: true,
              sign_url: true,
            });

            // Fetch the file using the download URL
            const fileResponse = await fetch(fileUrl);
            
            if (fileResponse.ok) {
              const fileBuffer = await fileResponse.arrayBuffer();
              const contentType = fileResponse.headers.get('content-type') || 
                (resourceType === 'raw' ? 'application/pdf' : 'application/octet-stream');
              
              return new NextResponse(fileBuffer, {
                headers: {
                  'Content-Type': contentType,
                  'Content-Disposition': `inline; filename="billing-proof-${record.id}.pdf"`,
                  'Cache-Control': 'private, max-age=3600',
                },
              });
            }
          }
        }
      } catch (cloudinaryError) {
        console.warn('[billing][proof] Cloudinary SDK error, falling back to direct fetch:', cloudinaryError);
      }
    }

    // Fallback: Try to fetch and proxy the file directly
    // This works for public resources or if Cloudinary SDK approach failed
    try {
      const fileResponse = await fetch(proofUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        }
      });
      
      if (fileResponse.ok) {
        const fileBuffer = await fileResponse.arrayBuffer();
        const contentType = fileResponse.headers.get('content-type') || 'application/pdf';
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="billing-proof-${record.id}.pdf"`,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } else {
        // If direct fetch fails, try to use Cloudinary API to make it public or get signed URL
        if (proofUrl.includes('cloudinary.com') && process.env.CLOUDINARY_API_SECRET) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Proof file is not accessible. The file may be private.',
              details: 'Please ensure the file is set to public access in Cloudinary, or contact support.',
              recordId: record.id
            },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { success: false, error: 'Failed to fetch proof file' },
          { status: fileResponse.status }
        );
      }
    } catch (fetchError) {
      console.error('[billing][proof] Error fetching file:', fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to access proof file',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[admin][billing][proof] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve proof',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

