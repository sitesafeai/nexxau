/**
 * STEP 3: FFmpeg HLS Pipeline
 * 
 * Spawns FFmpeg as a child process to convert RTSP → HLS.
 * 
 * Responsibilities:
 * - Spawn FFmpeg process
 * - Input: RTSP URL
 * - Output: HLS segments + .m3u8
 * - Low latency HLS (2s segments)
 * - Auto-reconnect RTSP
 * - Kill process cleanly on stop
 * - Log stdout/stderr for debugging
 * 
 * Constraints:
 * - NO frontend references
 * - Backend only
 * - Process management only
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface FFmpegProcess {
  process: ChildProcess;
  cameraId: string;
  rtspUrl: string;
  outputPath: string;
  startedAt: Date;
}

/**
 * FFmpeg process manager
 */
class FFmpegManager {
  private processes: Map<string, FFmpegProcess> = new Map();

  /**
   * Start FFmpeg process to convert RTSP to HLS
   * 
   * @param cameraId - Unique camera identifier
   * @param rtspUrl - RTSP source URL
   * @param outputDir - Directory to write HLS files (must exist)
   * @returns FFmpegProcess or null if process already exists
   */
  startHlsStream(
    cameraId: string,
    rtspUrl: string,
    outputDir: string
  ): FFmpegProcess | null {
    // Prevent duplicate processes
    if (this.processes.has(cameraId)) {
      console.warn(`[FFmpeg] Stream for camera ${cameraId} already exists`);
      return null;
    }

    // Validate RTSP URL
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      throw new Error(`Invalid RTSP URL: ${rtspUrl}`);
    }

    // Ensure output directory exists and is writable
    if (!fs.existsSync(outputDir)) {
      throw new Error(`Output directory does not exist: ${outputDir}`);
    }

    // Verify directory is writable
    try {
      fs.accessSync(outputDir, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`Output directory is not writable: ${outputDir}`);
    }

    const outputPath = path.join(outputDir, 'index.m3u8');

    // 🔥 HARD LOGGING - ENFORCE VISIBILITY
    console.log('🔥 STARTING FFMPEG');
    console.log('RTSP URL:', rtspUrl);
    console.log('Camera ID:', cameraId);
    console.log('Output dir:', outputDir);
    console.log('Resolved HLS path:', path.resolve(outputPath));

    // FFmpeg command for low-latency HLS
    // -rtsp_transport tcp: Use TCP for RTSP (more reliable)
    // -i: Input RTSP URL
    // -an: Disable audio
    // -c:v copy: Copy video codec (no re-encoding for speed)
    // -f hls: Output format HLS
    // -hls_time 4: 4 second segments (as per requirements)
    // -hls_list_size 5: Keep 5 segments in playlist (as per requirements)
    // -hls_flags delete_segments+append_list+independent_segments: Delete old segments, append to list, independent segments (as per requirements)
    // -hls_allow_cache 0: Disable caching (CRITICAL for live streams)
    // -hls_segment_filename: Segment file naming pattern (must be absolute path to prevent path corruption)
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts');
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp', // Use TCP for RTSP
      '-i', rtspUrl, // Input RTSP URL
      '-an', // Disable audio
      '-c:v', 'copy', // Copy video (no re-encode)
      '-f', 'hls', // Output format HLS
      '-hls_time', '4', // 4 second segments (as per requirements)
      '-hls_list_size', '5', // Keep 5 segments in playlist (as per requirements)
      '-hls_flags', 'delete_segments+append_list+independent_segments', // Delete old segments, append to list, independent segments (as per requirements)
      '-hls_allow_cache', '0', // CRITICAL: Disable caching for live streams
      '-hls_segment_filename', segmentPattern, // Segment filename pattern (absolute path)
      outputPath, // Output playlist file
    ];

    console.log(`[FFmpeg] Command: ffmpeg ${ffmpegArgs.join(' ')}`);

    // Spawn FFmpeg process
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout/stderr: pipe for logging
    });

    // 🔥 HARD LOGGING - Process spawn event
    ffmpegProcess.on('spawn', () => {
      console.log(`✅ FFmpeg spawned for ${cameraId}`);
    });

    // 🔥 HARD LOGGING - Process error (spawn failure)
    ffmpegProcess.on('error', (err) => {
      console.error('❌ FFmpeg spawn error:', err);
      console.error(`❌ FFmpeg spawn error for ${cameraId}:`, err.message);
      this.processes.delete(cameraId);
    });

    // Log stdout (info messages)
    ffmpegProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[ffmpeg:${cameraId}]`, message);
      }
    });

    // 🔥 HARD LOGGING - Log stderr (FFmpeg uses stderr for output)
    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
      // Log every line from stderr (FFmpeg's main output)
      console.log(`[ffmpeg:${cameraId}]`, message);
    });

    // 🔥 HARD LOGGING - Handle process exit
    ffmpegProcess.on('exit', (code, signal) => {
      console.error(`🛑 FFmpeg exited for ${cameraId} with code ${code}, signal ${signal}`);
      console.error(`[FFmpeg:${cameraId}] Process died unexpectedly - stream will freeze`);
      
      // CRITICAL: Remove from registry so it can be restarted
      this.processes.delete(cameraId);
      
      // CRITICAL: Notify stream registry that process died
      try {
        const { streamRegistry } = require('./streamRegistry');
        streamRegistry.markProcessDead(cameraId);
      } catch (e) {
        console.warn(`[FFmpeg:${cameraId}] Failed to notify registry of process death:`, e);
      }
    });

    const processInfo: FFmpegProcess = {
      process: ffmpegProcess,
      cameraId,
      rtspUrl,
      outputPath,
      startedAt: new Date(),
    };

    this.processes.set(cameraId, processInfo);

    return processInfo;
  }

  /**
   * Stop FFmpeg process for a camera
   * 
   * @param cameraId - Camera ID to stop
   * @returns true if process was stopped, false if not found
   */
  stopHlsStream(cameraId: string): Promise<boolean> {
    const processInfo = this.processes.get(cameraId);
    if (!processInfo) {
      return Promise.resolve(false);
    }

    console.log(`[FFmpeg] Stopping stream for camera ${cameraId}`);

    return new Promise((resolve) => {
      // Kill the process gracefully first (SIGTERM)
      if (processInfo.process.killed === false) {
        processInfo.process.kill('SIGTERM');

        // Wait for process to exit (up to 5 seconds)
        const timeoutId = setTimeout(() => {
          if (processInfo.process.killed === false) {
            console.warn(`[FFmpeg:${cameraId}] Process did not exit gracefully, force killing`);
            processInfo.process.kill('SIGKILL');
          }
          this.processes.delete(cameraId);
          resolve(true);
        }, 5000);

        // If process exits before timeout, clear timeout and resolve
        processInfo.process.once('exit', () => {
          clearTimeout(timeoutId);
          console.log(`[FFmpeg:${cameraId}] Process exited gracefully`);
          this.processes.delete(cameraId);
          resolve(true);
        });
      } else {
        this.processes.delete(cameraId);
        resolve(true);
      }
    });
  }

  /**
   * Get FFmpeg process info
   * 
   * @param cameraId - Camera ID
   * @returns Process info or undefined
   */
  getProcess(cameraId: string): FFmpegProcess | undefined {
    return this.processes.get(cameraId);
  }

  /**
   * Check if process exists
   */
  hasProcess(cameraId: string): boolean {
    return this.processes.has(cameraId);
  }

  /**
   * Stop all processes (cleanup)
   */
  stopAll(): void {
    const cameraIds = Array.from(this.processes.keys());
    cameraIds.forEach((cameraId) => {
      this.stopHlsStream(cameraId);
    });
  }

  /**
   * Get all active process IDs
   */
  getAllProcessIds(): string[] {
    return Array.from(this.processes.keys());
  }
}

// Singleton instance
export const ffmpegManager = new FFmpegManager();

