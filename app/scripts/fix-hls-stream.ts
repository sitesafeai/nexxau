#!/usr/bin/env ts-node
/**
 * HLS Stream Auto-Fix Script
 * 
 * Diagnoses and automatically fixes HLS 404 issues for camera streams.
 * 
 * Usage:
 *   ts-node scripts/fix-hls-stream.ts <cameraId> <rtspUrl>
 * 
 * Example:
 *   ts-node scripts/fix-hls-stream.ts cmjhp39h3000pp9d915wnv42x "rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people"
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DiagnosticResult {
  step: string;
  status: '✅' | '❌';
  details: string;
}

const results: DiagnosticResult[] = [];

function log(step: string, status: '✅' | '❌', details: string) {
  const result: DiagnosticResult = { step, status, details };
  results.push(result);
  console.log(`[HLS Fixer] ${step}: ${status} ${details}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: ts-node scripts/fix-hls-stream.ts <cameraId> <rtspUrl>');
    console.error('Example: ts-node scripts/fix-hls-stream.ts cmjhp39h3000pp9d915wnv42x "rtsp://rtspstream:pass@host/stream"');
    process.exit(1);
  }

  const cameraId = args[0];
  const rtspUrl = args[1];
  const projectRoot = process.cwd();

  console.log('\n🔥 HLS Stream Auto-Fix Diagnostic & Repair');
  console.log('='.repeat(60));
  console.log(`Camera ID: ${cameraId}`);
  console.log(`RTSP URL: ${rtspUrl}`);
  console.log(`Project Root: ${projectRoot}`);
  console.log('='.repeat(60) + '\n');

  // ============================================================
  // STEP 1: Verify HLS Files
  // ============================================================
  console.log('[HLS Fixer] Step 1: Checking HLS files...');
  
  const expectedStreamDir = path.join(projectRoot, 'app', 'public', 'streams', cameraId);
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
      
      log('Step 1: Files exist', '✅', 
        `Found ${fileCount} files. index.m3u8 last modified: ${lastModified?.toISOString()}`);
    } else {
      log('Step 1: Files exist', '❌', 
        `Directory exists but index.m3u8 missing. Found ${fileCount} other files.`);
    }
  } else {
    log('Step 1: Files exist', '❌', 
      `Directory does not exist: ${expectedStreamDir}`);
  }

  // ============================================================
  // STEP 2: Fix Missing or Wrong Paths
  // ============================================================
  console.log('\n[HLS Fixer] Step 2: Fixing paths...');
  
  // Ensure directory exists
  if (!fs.existsSync(expectedStreamDir)) {
    try {
      fs.mkdirSync(expectedStreamDir, { recursive: true });
      log('Step 2: Fixed output path', '✅', 
        `Created directory: ${expectedStreamDir}`);
    } catch (error: any) {
      log('Step 2: Fixed output path', '❌', 
        `Failed to create directory: ${error.message}`);
      process.exit(1);
    }
  } else {
    log('Step 2: Fixed output path', '✅', 
      `Directory already exists: ${expectedStreamDir}`);
  }

  const resolvedPath = path.resolve(expectedM3u8);
  console.log(`[HLS Fixer] Resolved HLS path: ${resolvedPath}`);

  // ============================================================
  // STEP 3: Verify & Restart FFmpeg
  // ============================================================
  console.log('\n[HLS Fixer] Step 3: Checking FFmpeg process...');
  
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
          log('Step 3: FFmpeg running', '✅', 
            `FFmpeg process found (PID: ${ffmpegPid})`);
        }
      }
    }
  } catch (error) {
    // No FFmpeg process found
    log('Step 3: FFmpeg running', '❌', 
      'No FFmpeg process found for this camera');
  }

  // Kill any stray processes
  if (ffmpegRunning && ffmpegPid) {
    try {
      console.log(`[HLS Fixer] Killing existing FFmpeg process (PID: ${ffmpegPid})...`);
      await execAsync(`kill ${ffmpegPid}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for process to die
      log('Step 3: FFmpeg restarted', '✅', 
        `Killed existing process (PID: ${ffmpegPid})`);
    } catch (error: any) {
      console.warn(`[HLS Fixer] Could not kill process: ${error.message}`);
    }
  }

  // Start FFmpeg if not running or if we just killed it
  if (!ffmpegRunning || ffmpegPid) {
    console.log('\n🔥 STARTING FFmpeg');
    console.log(`RTSP URL: ${rtspUrl}`);
    console.log(`Camera ID: ${cameraId}`);
    console.log(`Output dir: ${expectedStreamDir}`);
    console.log(`Resolved HLS path: ${resolvedPath}`);

    const segmentPattern = path.join(expectedStreamDir, 'segment_%03d.ts');
    const outputM3u8 = path.join(expectedStreamDir, 'index.m3u8');

    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-an',
      '-c:v', 'copy',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', segmentPattern,
      outputM3u8,
    ];

    console.log(`[FFmpeg] Command: ffmpeg ${ffmpegArgs.join(' ')}`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    ffmpegProcess.on('spawn', () => {
      console.log(`✅ FFmpeg spawned for ${cameraId}`);
      log('Step 3: FFmpeg restarted', '✅', 
        `FFmpeg process started (PID: ${ffmpegProcess.pid})`);
    });

    ffmpegProcess.on('error', (err) => {
      console.error('❌ FFmpeg spawn error:', err);
      log('Step 3: FFmpeg restarted', '❌', 
        `Failed to spawn FFmpeg: ${err.message}`);
    });

    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`[ffmpeg:${cameraId}]`, message);
    });

    ffmpegProcess.on('exit', (code, signal) => {
      console.log(`🛑 FFmpeg exited for ${cameraId} with code ${code}, signal ${signal}`);
      if (code !== 0 && code !== null) {
        log('Step 3: FFmpeg restarted', '❌', 
          `FFmpeg exited with code ${code}`);
      }
    });

    // Wait a bit to see if FFmpeg starts successfully
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // ============================================================
  // STEP 4: Verify Next.js Serving
  // ============================================================
  console.log('\n[HLS Fixer] Step 4: Verifying Next.js serving...');
  
  const publicUrl = `http://localhost:3000/streams/${cameraId}/index.m3u8`;
  console.log(`[HLS Fixer] Expected public URL: ${publicUrl}`);

  // Check if file exists at expected location
  if (fs.existsSync(expectedM3u8)) {
    log('Step 4: Verified public URL', '✅', 
      `File exists at: ${expectedM3u8}`);
    log('Step 4: Verified public URL', '✅', 
      `Should be accessible at: ${publicUrl}`);
  } else {
    log('Step 4: Verified public URL', '❌', 
      `File does not exist at: ${expectedM3u8}`);
  }

  // ============================================================
  // STEP 5: Frontend Check
  // ============================================================
  console.log('\n[HLS Fixer] Step 5: Checking frontend component...');
  
  const cameraStreamViewerPath = path.join(projectRoot, 'app', 'components', 'camera', 'CameraStreamViewer.tsx');
  
  if (fs.existsSync(cameraStreamViewerPath)) {
    const content = fs.readFileSync(cameraStreamViewerPath, 'utf-8');
    
    if (content.includes('hlsUrl') && content.includes('.m3u8')) {
      if (content.includes('rtsp://') && content.includes('throw')) {
        log('Step 5: Frontend check', '✅', 
          'CameraStreamViewer correctly rejects RTSP URLs');
      } else {
        log('Step 5: Frontend check', '⚠️', 
          'CameraStreamViewer found but RTSP rejection not verified');
      }
      
      log('Step 5: Frontend check', '✅', 
        `CameraStreamViewer should use: hlsUrl="/streams/${cameraId}/index.m3u8"`);
    } else {
      log('Step 5: Frontend check', '❌', 
        'CameraStreamViewer does not properly handle HLS URLs');
    }
  } else {
    log('Step 5: Frontend check', '❌', 
      'CameraStreamViewer component not found');
  }

  // ============================================================
  // STEP 6: Verification
  // ============================================================
  console.log('\n[HLS Fixer] Step 6: Final verification...');
  
  // Check files on disk
  if (fs.existsSync(expectedStreamDir)) {
    const files = fs.readdirSync(expectedStreamDir);
    const m3u8Exists = files.includes('index.m3u8');
    const segmentFiles = files.filter(f => f.startsWith('segment_') && f.endsWith('.ts'));
    
    log('Step 6: Files on disk', m3u8Exists ? '✅' : '❌', 
      `index.m3u8: ${m3u8Exists ? 'exists' : 'missing'}, ${segmentFiles.length} segment files`);
  } else {
    log('Step 6: Files on disk', '❌', 
      'Stream directory does not exist');
  }

  // Check FFmpeg process
  try {
    const { stdout } = await execAsync(`ps aux | grep ffmpeg | grep ${cameraId} | grep -v grep`);
    if (stdout.trim()) {
      const match = stdout.match(/^\S+\s+(\d+)/);
      if (match) {
        log('Step 6: FFmpeg process', '✅', 
          `FFmpeg is running (PID: ${match[1]})`);
      }
    } else {
      log('Step 6: FFmpeg process', '❌', 
        'FFmpeg is not running');
    }
  } catch (error) {
    log('Step 6: FFmpeg process', '❌', 
      'FFmpeg is not running');
  }

  // Try to fetch HLS URL
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(publicUrl);
    
    if (response.ok) {
      const text = await response.text();
      if (text.includes('#EXTM3U')) {
        log('Step 6: Browser HLS load', '✅', 
          `HLS playlist accessible at ${publicUrl}`);
      } else {
        log('Step 6: Browser HLS load', '❌', 
          `URL accessible but not a valid M3U8 playlist`);
      }
    } else {
      log('Step 6: Browser HLS load', '❌', 
        `HTTP ${response.status} when accessing ${publicUrl}`);
    }
  } catch (error: any) {
    log('Step 6: Browser HLS load', '❌', 
      `Failed to fetch ${publicUrl}: ${error.message}`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  console.log('\nStep\t\t\tStatus\tDetails');
  console.log('-'.repeat(60));
  
  results.forEach(r => {
    console.log(`${r.step.padEnd(30)}\t${r.status}\t${r.details}`);
  });

  console.log('\n' + '='.repeat(60));
  
  const successCount = results.filter(r => r.status === '✅').length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    console.log('✅ All checks passed! HLS stream should be working.');
  } else {
    console.log(`⚠️  ${successCount}/${totalCount} checks passed. Review failures above.`);
  }
  
  console.log('='.repeat(60) + '\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

