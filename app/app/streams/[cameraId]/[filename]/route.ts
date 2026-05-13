/**
 * GET /streams/[cameraId]/[filename]
 * 
 * Serves HLS files (index.m3u8 and segment_*.ts) from the public directory.
 * This route handler ensures Next.js serves the dynamically generated HLS files.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import { requireCameraAccess } from '@/app/lib/api-route-auth';
import { getStreamDirectory } from '@/app/lib/streaming/streamPaths';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string; filename: string }> }
): Promise<NextResponse> {
  try {
    const { cameraId, filename } = await params;

    console.log(`[Streams Route] GET /streams/${cameraId}/${filename}`);

    const auth = await requireCameraAccess(cameraId);
    if (!auth.ok) {
      return auth.response;
    }

    // Security: Only allow .m3u8 and .ts files
    if (!filename.endsWith('.m3u8') && !filename.endsWith('.ts')) {
      console.warn(`[Streams Route] Invalid file type: ${filename}`);
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Security: Prevent path traversal
    if (filename.includes('..') || cameraId.includes('..')) {
      console.warn(`[Streams Route] Path traversal attempt: ${cameraId}/${filename}`);
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    const filePath = path.join(getStreamDirectory(cameraId), filename);
    console.log(`[Streams Route] Using private stream path: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`[Streams Route] File not found: ${filePath}`);
      console.warn(`[Streams Route] Directory exists: ${fs.existsSync(path.dirname(filePath))}`);
      
      // If it's an M3U8 file and doesn't exist, wait a bit for FFmpeg to create it
      // (FFmpeg should already be running from /api/streams endpoint)
      if (filename.endsWith('.m3u8')) {
        console.log(`[Streams Route] M3U8 not found, waiting for FFmpeg to create it...`);
        
        // Wait up to 10 seconds for FFmpeg to create the file
        let fileReady = false;
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (fs.existsSync(filePath)) {
            fileReady = true;
            console.log(`[Streams Route] File created after ${(i + 1) * 500}ms`);
            break;
          }
        }
        
        if (!fileReady) {
          console.warn(`[Streams Route] File still not found after 10 seconds. FFmpeg may not be running.`);
          return NextResponse.json(
            { error: 'Stream not ready. Please start the stream via /api/streams/[cameraId] first.' },
            { status: 404 }
          );
        }
      } else {
        // For .ts segments, just return 404 if not found
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
    }

    // Read file stats first (CRITICAL: Must get fresh stats for live streams)
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // CRITICAL: If file is empty or doesn't exist, return 404
    if (fileSize === 0) {
      console.warn(`[Streams Route] File is empty: ${filePath}`);
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 404 }
      );
    }

    // Determine content type
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.m3u8')) {
      contentType = 'application/vnd.apple.mpegurl';
    } else if (filename.endsWith('.ts')) {
      contentType = 'video/mp2t';
    }

    // CRITICAL: Base headers for all responses (live streams must never be cached)
    const baseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      // CRITICAL: Aggressive no-cache headers for live streams
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    };

    // CRITICAL: Handle HTTP Range requests (hls.js ALWAYS requests ranges)
    const range = request.headers.get('range');
    if (range) {
      // Parse Range header: "bytes=start-end" or "bytes=start-"
      const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
      
      if (!rangeMatch) {
        // Invalid range format - return 416 with Content-Range header
        console.warn(`[Streams Route] Invalid range format: ${range}`);
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${fileSize}`, // Required for 416 response
          },
        });
      }

      const start = parseInt(rangeMatch[1], 10);
      // If end is not specified, it means "to end of file"
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;

      // CRITICAL: Validate range bounds
      if (start < 0 || start >= fileSize) {
        console.warn(`[Streams Route] Range start out of bounds: ${start} (file size: ${fileSize})`);
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      // CRITICAL: Clamp end to file size
      const clampedEnd = Math.min(end, fileSize - 1);
      
      // CRITICAL: Validate end >= start
      if (clampedEnd < start) {
        console.warn(`[Streams Route] Invalid range: start ${start} > end ${clampedEnd}`);
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = clampedEnd - start + 1;

      // CRITICAL: Read only the requested byte range
      const fileBuffer = Buffer.allocUnsafe(chunkSize);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, fileBuffer, 0, chunkSize, start);
      } finally {
        fs.closeSync(fd);
      }

      // CRITICAL: Return 206 Partial Content with proper headers
      const headers: HeadersInit = {
        ...baseHeaders,
        'Content-Length': chunkSize.toString(),
        'Content-Range': `bytes ${start}-${clampedEnd}/${fileSize}`, // CRITICAL: Must match actual range
      };

      return new NextResponse(fileBuffer, { status: 206, headers });
    }

    // Full file response (for non-range requests or initial requests)
    // CRITICAL: For live streams, this should rarely happen, but we support it
    const fileBuffer = fs.readFileSync(filePath);
    const headers: HeadersInit = {
      ...baseHeaders,
      'Content-Length': fileSize.toString(),
    };

    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error: any) {
    console.error('[Streams Route] Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      // CRITICAL: Don't cache OPTIONS responses
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// Handle HEAD requests (for range request validation)
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string; filename: string }> }
): Promise<NextResponse> {
  try {
    const { cameraId, filename } = await params;

    // Security checks (same as GET)
    if (!filename.endsWith('.m3u8') && !filename.endsWith('.ts')) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    if (filename.includes('..') || cameraId.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    const auth = await requireCameraAccess(cameraId);
    if (!auth.ok) {
      return auth.response;
    }

    const filePath = path.join(getStreamDirectory(cameraId), filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    let contentType = 'application/octet-stream';
    if (filename.endsWith('.m3u8')) {
      contentType = 'application/vnd.apple.mpegurl';
    } else if (filename.endsWith('.ts')) {
      contentType = 'video/mp2t';
    }

    // CRITICAL: Same headers as GET (no body)
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Accel-Buffering': 'no',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    };

    return new NextResponse(null, { status: 200, headers });
  } catch (error: any) {
    console.error('[Streams Route] HEAD Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

