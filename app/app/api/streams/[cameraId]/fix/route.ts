/**
 * POST /api/streams/[cameraId]/fix
 * 
 * Auto-fix HLS 404 issues for a camera stream.
 * 
 * This endpoint:
 * 1. Verifies HLS files exist
 * 2. Fixes missing/wrong paths
 * 3. Kills and restarts FFmpeg if needed
 * 4. Verifies Next.js serving
 * 5. Returns diagnostic results
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ensureHlsStream, stopHlsStream, isStreamActive } from '@/lib/streaming/hlsManager';
import { prisma } from '@/lib/prisma';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

interface DiagnosticStep {
  step: string;
  status: '✅' | '❌' | '⚠️';
  details: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { cameraId: string } }
): Promise<NextResponse> {
  const diagnostics: DiagnosticStep[] = [];
  const cameraId = params.cameraId;
  const projectRoot = process.cwd();

  console.log('\n🔥 [HLS Fixer] Starting auto-fix for camera:', cameraId);

  try {
    // ============================================================
    // STEP 1: Verify HLS Files
    // ============================================================
    console.log('[HLS Fixer] Step 1: Checking HLS files...');
    
    // Use the same path resolution logic as hlsManager
    // Priority: Check for 'public' directory first (most reliable)
    let expectedStreamDir: string;
    if (fs.existsSync(path.join(projectRoot, 'public'))) {
      // We're in app directory: <repo-root>/app
      expectedStreamDir = path.join(projectRoot, 'public', 'streams', cameraId);
      console.log(`[HLS Fixer] Detected app directory structure. Using: ${expectedStreamDir}`);
    } else if (fs.existsSync(path.join(projectRoot, 'app', 'public'))) {
      // We're at repo root: <repo-root>
      expectedStreamDir = path.join(projectRoot, 'app', 'public', 'streams', cameraId);
      console.log(`[HLS Fixer] Detected repo root structure. Using: ${expectedStreamDir}`);
    } else {
      // Fallback: assume we're in app directory
      expectedStreamDir = path.join(projectRoot, 'public', 'streams', cameraId);
      console.log(`[HLS Fixer] Using fallback path: ${expectedStreamDir}`);
    }
    const expectedM3u8 = path.join(expectedStreamDir, 'index.m3u8');
    
    let filesExist = false;
    let fileCount = 0;
    let lastModified: Date | null = null;

    if (fs.existsSync(expectedStreamDir)) {
      const files = fs.readdirSync(expectedStreamDir);
      fileCount = files.length;
      
      if (fs.existsSync(expectedM3u8)) {
        filesExist = true;
        const stats = fs.statSync(expectedM3u8);
        lastModified = stats.mtime;
        
        diagnostics.push({
          step: 'Files exist',
          status: '✅',
          details: `Found ${fileCount} files. index.m3u8 last modified: ${lastModified.toISOString()}`
        });
      } else {
        diagnostics.push({
          step: 'Files exist',
          status: '❌',
          details: `Directory exists but index.m3u8 missing. Found ${fileCount} other files.`
        });
      }
    } else {
      diagnostics.push({
        step: 'Files exist',
        status: '❌',
        details: `Directory does not exist: ${expectedStreamDir}`
      });
    }

    // ============================================================
    // STEP 2: Fix Missing or Wrong Paths
    // ============================================================
    console.log('[HLS Fixer] Step 2: Fixing paths...');
    
    if (!fs.existsSync(expectedStreamDir)) {
      try {
        fs.mkdirSync(expectedStreamDir, { recursive: true });
        diagnostics.push({
          step: 'Fixed output path',
          status: '✅',
          details: `Created directory: ${expectedStreamDir}`
        });
      } catch (error: any) {
        diagnostics.push({
          step: 'Fixed output path',
          status: '❌',
          details: `Failed to create directory: ${error.message}`
        });
        throw error;
      }
    } else {
      diagnostics.push({
        step: 'Fixed output path',
        status: '✅',
        details: `Directory already exists: ${expectedStreamDir}`
      });
    }

    const resolvedPath = path.resolve(expectedM3u8);
    console.log(`[HLS Fixer] Resolved HLS path: ${resolvedPath}`);

    // ============================================================
    // STEP 3: Get RTSP URL and Verify & Restart FFmpeg
    // ============================================================
    console.log('[HLS Fixer] Step 3: Checking FFmpeg process...');
    
    // Get RTSP URL from database or request body
    let rtspUrl: string | null = null;
    
    try {
      const body = await request.json().catch(() => ({}));
      rtspUrl = body.rtspUrl || null;
      
      if (!rtspUrl) {
        const camera = await prisma.camera.findUnique({
          where: { id: cameraId },
          select: { streamUrl: true },
        });
        rtspUrl = camera?.streamUrl || null;
      }
    } catch (error) {
      // Try query param as fallback
      const rtspUrlParam = request.nextUrl.searchParams.get('rtspUrl');
      rtspUrl = rtspUrlParam;
    }

    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      diagnostics.push({
        step: 'FFmpeg running',
        status: '❌',
        details: `No valid RTSP URL found for camera ${cameraId}`
      });
      
      return NextResponse.json({
        success: false,
        error: 'RTSP URL is required',
        diagnostics,
      }, { status: 400 });
    }

    // Check if FFmpeg is running
    let ffmpegRunning = false;
    let ffmpegPid: string | null = null;

    try {
      const { stdout } = await execAsync(`ps aux | grep ffmpeg | grep ${cameraId} | grep -v grep`);
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        if (lines.length > 0) {
          const match = lines[0].match(/^\S+\s+(\d+)/);
          if (match) {
            ffmpegPid = match[1];
            ffmpegRunning = true;
            diagnostics.push({
              step: 'FFmpeg running',
              status: '✅',
              details: `FFmpeg process found (PID: ${ffmpegPid})`
            });
          }
        }
      }
    } catch (error) {
      diagnostics.push({
        step: 'FFmpeg running',
        status: '❌',
        details: 'No FFmpeg process found for this camera'
      });
    }

    // Stop existing stream if needed
    if (isStreamActive(cameraId) || ffmpegRunning) {
      console.log('[HLS Fixer] Stopping existing stream...');
      await stopHlsStream(cameraId);
      
      if (ffmpegPid) {
        try {
          await execAsync(`kill ${ffmpegPid} 2>/dev/null || true`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          // Ignore
        }
      }
    }

    // Start new stream
    console.log('🔥 STARTING FFmpeg');
    console.log(`RTSP URL: ${rtspUrl}`);
    console.log(`Camera ID: ${cameraId}`);
    console.log(`Output dir: ${expectedStreamDir}`);
    console.log(`Resolved HLS path: ${resolvedPath}`);

    const hlsUrl = ensureHlsStream(cameraId, rtspUrl);
    
    if (hlsUrl) {
      diagnostics.push({
        step: 'FFmpeg restarted',
        status: '✅',
        details: `FFmpeg process started successfully`
      });
    } else {
      diagnostics.push({
        step: 'FFmpeg restarted',
        status: '❌',
        details: `Failed to start FFmpeg process`
      });
    }

    // Wait for FFmpeg to start and create initial files (up to 5 seconds)
    console.log('[HLS Fixer] Waiting for FFmpeg to create initial files...');
    let filesReady = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (fs.existsSync(expectedM3u8)) {
        filesReady = true;
        break;
      }
    }

    // ============================================================
    // STEP 4: Verify Next.js Serving
    // ============================================================
    console.log('[HLS Fixer] Step 4: Verifying Next.js serving...');
    
    const publicUrl = `http://localhost:3000/streams/${cameraId}/index.m3u8`;
    
    // Re-check file existence after wait period
    if (fs.existsSync(expectedM3u8)) {
      const stats = fs.statSync(expectedM3u8);
      diagnostics.push({
        step: 'Public URL',
        status: '✅',
        details: `File exists and should be accessible at: ${publicUrl} (size: ${stats.size} bytes, modified: ${stats.mtime.toISOString()})`
      });
    } else {
      diagnostics.push({
        step: 'Public URL',
        status: filesReady ? '⚠️' : '❌',
        details: `File does not exist at: ${expectedM3u8} ${filesReady ? '(FFmpeg may still be starting)' : '(FFmpeg may have failed to start)'}`
      });
    }

    // ============================================================
    // STEP 5: Final Verification
    // ============================================================
    console.log('[HLS Fixer] Step 5: Final verification...');
    
    // Check files on disk
    if (fs.existsSync(expectedStreamDir)) {
      const files = fs.readdirSync(expectedStreamDir);
      const m3u8Exists = files.includes('index.m3u8');
      const segmentFiles = files.filter(f => f.startsWith('segment_') && f.endsWith('.ts'));
      
      diagnostics.push({
        step: 'HLS playable',
        status: m3u8Exists ? '✅' : '❌',
        details: `index.m3u8: ${m3u8Exists ? 'exists' : 'missing'}, ${segmentFiles.length} segment files`
      });
    } else {
      diagnostics.push({
        step: 'HLS playable',
        status: '❌',
        details: 'Stream directory does not exist'
      });
    }

    // Check FFmpeg process again
    try {
      const { stdout } = await execAsync(`ps aux | grep ffmpeg | grep ${cameraId} | grep -v grep`);
      if (stdout.trim()) {
        const match = stdout.match(/^\S+\s+(\d+)/);
        if (match) {
          diagnostics.push({
            step: 'FFmpeg process',
            status: '✅',
            details: `FFmpeg is running (PID: ${match[1]})`
          });
        }
      } else {
        diagnostics.push({
          step: 'FFmpeg process',
          status: '❌',
          details: 'FFmpeg is not running'
        });
      }
    } catch (error) {
      diagnostics.push({
        step: 'FFmpeg process',
        status: '❌',
        details: 'FFmpeg is not running'
      });
    }

    const successCount = diagnostics.filter(d => d.status === '✅').length;
    const totalCount = diagnostics.length;

    return NextResponse.json({
      success: successCount === totalCount,
      cameraId,
      hlsUrl: hlsUrl || null,
      publicUrl,
      diagnostics,
      summary: {
        passed: successCount,
        total: totalCount,
        message: successCount === totalCount 
          ? '✅ All checks passed! HLS stream should be working.' 
          : `⚠️ ${successCount}/${totalCount} checks passed. Review failures above.`
      }
    });

  } catch (error: any) {
    console.error('[HLS Fixer] Error:', error);
    
    diagnostics.push({
      step: 'Error',
      status: '❌',
      details: error.message || 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fix HLS stream',
      diagnostics,
    }, { status: 500 });
  }
}

