/**
 * STEP 4: HLS Manager
 * 
 * Coordinates registry and FFmpeg process lifecycle.
 * Handles all filesystem operations.
 * 
 * Responsibilities:
 * - Ensure stream directory exists
 * - Clean old segments on restart
 * - Coordinate registry and FFmpeg
 * 
 * Constraints:
 * - This is the ONLY place allowed to touch the filesystem
 * - No other module should access /public/streams directly
 */

import * as path from 'path';
import * as fs from 'fs';
import { streamRegistry } from './streamRegistry';
import { ffmpegManager } from './ffmpeg';
import { getStreamDirectory } from './streamPaths';

/**
 * Ensure stream directory exists and is clean
 */
function ensureStreamDirectory(cameraId: string): string {
  const streamDir = getStreamDirectory(cameraId);

  // Create directory if it doesn't exist (with proper permissions)
  if (!fs.existsSync(streamDir)) {
    fs.mkdirSync(streamDir, { recursive: true, mode: 0o755 });
    console.log(`[HLS Manager] Created stream directory: ${streamDir}`);
  } else {
    // Verify directory permissions
    try {
      fs.accessSync(streamDir, fs.constants.W_OK);
    } catch (error) {
      console.error(`[HLS Manager] Directory not writable: ${streamDir}`, error);
      throw new Error(`Stream directory is not writable: ${streamDir}`);
    }
  }

  // Only clean the playlist file (index.m3u8) - let FFmpeg handle segment cleanup
  // This prevents conflicts with FFmpeg's rename operation
  const playlistPath = path.join(streamDir, 'index.m3u8');
  const playlistTmpPath = path.join(streamDir, 'index.m3u8.tmp');
  
  try {
    if (fs.existsSync(playlistPath)) {
      fs.unlinkSync(playlistPath);
      console.log(`[HLS Manager] Cleaned old playlist: ${playlistPath}`);
    }
    if (fs.existsSync(playlistTmpPath)) {
      fs.unlinkSync(playlistTmpPath);
      console.log(`[HLS Manager] Cleaned old temp playlist: ${playlistTmpPath}`);
    }
  } catch (error) {
    console.warn(`[HLS Manager] Failed to clean playlist files:`, error);
  }

  // Note: We don't clean segment files here - FFmpeg's delete_segments flag handles that
  // Cleaning segments while FFmpeg is writing can cause rename failures

  return streamDir;
}

/**
 * Ensure HLS stream is running for a camera
 * 
 * This is the main entry point for starting a stream.
 * It coordinates:
 * - Registry (prevent duplicates)
 * - Directory creation (filesystem)
 * - FFmpeg process (streaming)
 * 
 * @param cameraId - Unique camera identifier
 * @param rtspUrl - RTSP source URL
 * @returns HLS URL path or null if failed
 */
export function ensureHlsStream(cameraId: string, rtspUrl: string): string | null {
  // Hard failure: RTSP URL must be provided
  if (!rtspUrl || !rtspUrl.trim()) {
    throw new Error('RTSP URL is required');
  }

  // Hard failure: RTSP URL must start with rtsp://
  if (!rtspUrl.startsWith('rtsp://')) {
    throw new Error(`Invalid RTSP URL format. Must start with rtsp:// Got: ${rtspUrl}`);
  }

  // CRITICAL: Check if FFmpeg process exists AND is actually alive
  if (ffmpegManager.hasProcess(cameraId)) {
    const processInfo = ffmpegManager.getProcess(cameraId);
    if (processInfo && !processInfo.process.killed && processInfo.process.pid) {
      // FFmpeg is running - reuse existing
      console.log(`[HLS Manager] FFmpeg process for camera ${cameraId} is alive, reusing`);
      const hlsUrl = `/streams/${cameraId}/index.m3u8`;
      return hlsUrl;
    } else {
      // FFmpeg process is dead - clean up and restart
      console.warn(`[HLS Manager] FFmpeg process for camera ${cameraId} is dead, cleaning up...`);
      streamRegistry.stopStream(cameraId);
      // Fall through to start new stream
    }
  }

  // Check if stream exists in registry but FFmpeg is dead
  if (streamRegistry.hasStream(cameraId)) {
    // Registry has stream but FFmpeg is dead - clean up and restart
    console.warn(`[HLS Manager] Stream registry has ${cameraId} but FFmpeg is dead, cleaning up...`);
    streamRegistry.stopStream(cameraId);
    // Fall through to start new stream
  }

  try {
    // Ensure stream directory exists and is clean
    const streamDir = ensureStreamDirectory(cameraId);

    // 🔥 HARD LOGGING - Verify filesystem output path
    console.log('[HLS Manager] Resolved HLS path:', path.resolve(streamDir));
    console.log('[HLS Manager] Full output path:', path.resolve(path.join(streamDir, 'index.m3u8')));
    console.log('[HLS Manager] Project root:', process.cwd());
    console.log('[HLS Manager] Expected location: private HLS stream directory for camera', cameraId);

    // Register stream (prevent duplicates)
    const registered = streamRegistry.startStream(cameraId, rtspUrl);
    if (!registered) {
      // This shouldn't happen due to checks above, but guard anyway
      console.warn(`[HLS Manager] Failed to register stream for camera ${cameraId}`);
      return null;
    }

    // Start FFmpeg process
    const ffmpegProcess = ffmpegManager.startHlsStream(cameraId, rtspUrl, streamDir);
    if (!ffmpegProcess) {
      // Failed to start FFmpeg
      streamRegistry.stopStream(cameraId);
      console.error(`[HLS Manager] Failed to start FFmpeg process for camera ${cameraId}`);
      return null;
    }

    // Store FFmpeg PID in registry
    const streamInfo = streamRegistry.getStream(cameraId);
    if (streamInfo && ffmpegProcess.process.pid) {
      streamInfo.ffmpegPid = ffmpegProcess.process.pid;
    }

    // Return HLS URL path (relative to public directory)
    const hlsUrl = `/streams/${cameraId}/index.m3u8`;
    console.log(`[HLS Manager] HLS stream started for camera ${cameraId}: ${hlsUrl}`);
    return hlsUrl;

  } catch (error: any) {
    // Cleanup on error
    streamRegistry.stopStream(cameraId);
    ffmpegManager.stopHlsStream(cameraId);
    console.error(`[HLS Manager] Error starting stream for camera ${cameraId}:`, error);
    throw error;
  }
}

/**
 * Stop HLS stream for a camera
 * 
 * @param cameraId - Camera ID to stop
 * @returns true if stream was stopped, false if not found
 */
export async function stopHlsStream(cameraId: string): Promise<boolean> {
  // Stop FFmpeg process and wait for it to fully exit
  const ffmpegStopped = await ffmpegManager.stopHlsStream(cameraId);

  // Remove from registry
  const registryStopped = streamRegistry.stopStream(cameraId);

  if (ffmpegStopped || registryStopped) {
    console.log(`[HLS Manager] Stopped stream for camera ${cameraId}`);
    return true;
  }

  return false;
}

/**
 * Get HLS URL for a camera (if stream is active)
 * 
 * @param cameraId - Camera ID
 * @returns HLS URL or null if stream is not active
 */
export function getHlsUrl(cameraId: string): string | null {
  if (!streamRegistry.hasStream(cameraId)) {
    return null;
  }

  return `/streams/${cameraId}/index.m3u8`;
}

/**
 * Check if stream is active
 */
export function isStreamActive(cameraId: string): boolean {
  // CRITICAL: Check if FFmpeg process is actually alive, not just registered
  const hasProcess = ffmpegManager.hasProcess(cameraId);
  if (hasProcess) {
    const processInfo = ffmpegManager.getProcess(cameraId);
    if (processInfo) {
      // Verify process is actually alive (not killed)
      if (processInfo.process.killed) {
        console.warn(`[HLS Manager] FFmpeg process for ${cameraId} is marked as killed`);
        return false;
      }
      // Check if process is still running (has PID)
      if (!processInfo.process.pid) {
        console.warn(`[HLS Manager] FFmpeg process for ${cameraId} has no PID`);
        return false;
      }
    }
  }
  
  return streamRegistry.hasStream(cameraId) || hasProcess;
}

/**
 * Cleanup all streams (for shutdown)
 */
export async function cleanupAllStreams(): Promise<void> {
  console.log('[HLS Manager] Cleaning up all streams...');
  const cameraIds = streamRegistry.getAllStreamIds();
  await Promise.all(cameraIds.map((cameraId) => stopHlsStream(cameraId)));
}

// Register cleanup with graceful shutdown system
if (typeof process !== 'undefined') {
  try {
    const { gracefulShutdown } = require('@/app/lib/graceful-shutdown');
    gracefulShutdown.register(async () => {
      console.log('[HLS Manager] Graceful shutdown: stopping all FFmpeg processes...');
      await cleanupAllStreams();
    }, 'ffmpeg-streams');
    console.log('[HLS Manager] Registered graceful shutdown handler');
  } catch (error) {
    // Graceful shutdown might not be available, that's okay
    console.log('[HLS Manager] Graceful shutdown not available, using process handlers');
    
    // Fallback: register process signal handlers
    const cleanup = async () => {
      await cleanupAllStreams();
      process.exit(0);
    };
    
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }
}

