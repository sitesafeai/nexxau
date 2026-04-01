/**
 * GET /api/streams/[cameraId]/diagnostics
 * 
 * Diagnostic endpoint to check stream health:
 * - FFmpeg process status
 * - Segment files existence
 * - Playlist content and freshness
 * - File system state
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';
import { ffmpegManager } from '@/lib/streaming/ffmpeg';
import { streamRegistry } from '@/lib/streaming/streamRegistry';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
): Promise<NextResponse> {
  try {
    const { cameraId } = await params;

    if (!cameraId || !cameraId.trim()) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    const diagnostics: any = {
      cameraId,
      timestamp: new Date().toISOString(),
      ffmpeg: {
        hasProcess: ffmpegManager.hasProcess(cameraId),
        processInfo: null,
      },
      registry: {
        hasStream: streamRegistry.hasStream(cameraId),
        streamInfo: null,
      },
      filesystem: {
        directoryExists: false,
        playlistExists: false,
        playlistSize: 0,
        playlistModified: null,
        playlistContent: null,
        segmentCount: 0,
        segments: [],
        segmentDetails: [],
      },
    };

    // Check FFmpeg process
    if (ffmpegManager.hasProcess(cameraId)) {
      const processInfo = ffmpegManager.getProcess(cameraId);
      if (processInfo) {
        diagnostics.ffmpeg.processInfo = {
          startedAt: processInfo.startedAt?.toISOString(),
          rtspUrl: processInfo.rtspUrl,
          outputPath: processInfo.outputPath,
          processAlive: !processInfo.process.killed,
          processPid: processInfo.process.pid,
        };
      }
    }

    // Check registry
    if (streamRegistry.hasStream(cameraId)) {
      const streamInfo = streamRegistry.getStream(cameraId);
      diagnostics.registry.streamInfo = {
        rtspUrl: streamInfo?.rtspUrl,
        hlsUrl: streamInfo?.hlsUrl,
        startedAt: streamInfo?.startedAt?.toISOString(),
      };
    }

    // Check filesystem
    const cwd = process.cwd();
    let streamDir: string;
    
    if (fs.existsSync(path.join(cwd, 'public'))) {
      streamDir = path.join(cwd, 'public', 'streams', cameraId);
    } else if (fs.existsSync(path.join(cwd, 'app', 'public'))) {
      streamDir = path.join(cwd, 'app', 'public', 'streams', cameraId);
    } else {
      streamDir = path.join(cwd, 'public', 'streams', cameraId);
    }

    diagnostics.filesystem.directoryPath = streamDir;
    diagnostics.filesystem.directoryExists = fs.existsSync(streamDir);

    if (diagnostics.filesystem.directoryExists) {
      const playlistPath = path.join(streamDir, 'index.m3u8');
      diagnostics.filesystem.playlistExists = fs.existsSync(playlistPath);

      if (diagnostics.filesystem.playlistExists) {
        const stats = fs.statSync(playlistPath);
        diagnostics.filesystem.playlistSize = stats.size;
        diagnostics.filesystem.playlistModified = stats.mtime.toISOString();
        diagnostics.filesystem.playlistAgeSeconds = Math.floor((Date.now() - stats.mtime.getTime()) / 1000);

        // Read playlist content
        try {
          const playlistContent = fs.readFileSync(playlistPath, 'utf8');
          diagnostics.filesystem.playlistContent = playlistContent;

          // Parse playlist to find segments
          const lines = playlistContent.split('\n');
          const segmentLines = lines.filter(line => line.trim().endsWith('.ts') && !line.trim().startsWith('#'));
          
          diagnostics.filesystem.segmentCount = segmentLines.length;
          diagnostics.filesystem.segmentReferences = segmentLines;

          // Check if segments exist
          const segmentDetails: any[] = [];
          for (const segmentRef of segmentLines) {
            const segmentPath = path.join(streamDir, segmentRef.trim());
            const segmentExists = fs.existsSync(segmentPath);
            let segmentStats = null;
            
            if (segmentExists) {
              try {
                segmentStats = fs.statSync(segmentPath);
              } catch (e) {
                // Ignore stat errors
              }
            }

            segmentDetails.push({
              name: segmentRef.trim(),
              exists: segmentExists,
              size: segmentStats?.size || 0,
              modified: segmentStats?.mtime?.toISOString() || null,
              ageSeconds: segmentStats ? Math.floor((Date.now() - segmentStats.mtime.getTime()) / 1000) : null,
            });
          }

          diagnostics.filesystem.segmentDetails = segmentDetails;

          // Check for #EXT-X-ENDLIST (VOD marker - bad for live streams)
          diagnostics.filesystem.hasEndList = playlistContent.includes('#EXT-X-ENDLIST');
          
          // Check for #EXT-X-MEDIA-SEQUENCE (should increment for live streams)
          const mediaSequenceMatch = playlistContent.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);
          diagnostics.filesystem.mediaSequence = mediaSequenceMatch ? parseInt(mediaSequenceMatch[1], 10) : null;

          // Count missing segments
          const missingSegments = segmentDetails.filter(s => !s.exists).length;
          diagnostics.filesystem.missingSegments = missingSegments;
          diagnostics.filesystem.missingSegmentNames = segmentDetails.filter(s => !s.exists).map(s => s.name);

        } catch (readError: any) {
          diagnostics.filesystem.playlistReadError = readError.message;
        }
      }

      // List all files in directory
      try {
        const files = fs.readdirSync(streamDir);
        diagnostics.filesystem.allFiles = files;
        diagnostics.filesystem.totalFiles = files.length;
      } catch (readDirError: any) {
        diagnostics.filesystem.readDirError = readDirError.message;
      }
    }

    // Overall health assessment
    const isHealthy = 
      diagnostics.ffmpeg.hasProcess &&
      diagnostics.filesystem.playlistExists &&
      diagnostics.filesystem.playlistAgeSeconds < 10 && // Playlist updated in last 10 seconds
      diagnostics.filesystem.segmentCount > 0 &&
      diagnostics.filesystem.missingSegments === 0 &&
      !diagnostics.filesystem.hasEndList;

    diagnostics.health = {
      isHealthy,
      issues: [],
    };

    if (!diagnostics.ffmpeg.hasProcess) {
      diagnostics.health.issues.push('FFmpeg process not running');
    }
    if (!diagnostics.filesystem.playlistExists) {
      diagnostics.health.issues.push('Playlist file does not exist');
    }
    if (diagnostics.filesystem.playlistAgeSeconds >= 10) {
      diagnostics.health.issues.push(`Playlist is stale (${diagnostics.filesystem.playlistAgeSeconds}s old)`);
    }
    if (diagnostics.filesystem.segmentCount === 0) {
      diagnostics.health.issues.push('No segments in playlist');
    }
    if (diagnostics.filesystem.missingSegments > 0) {
      diagnostics.health.issues.push(`${diagnostics.filesystem.missingSegments} segment(s) missing from filesystem`);
    }
    if (diagnostics.filesystem.hasEndList) {
      diagnostics.health.issues.push('Playlist has #EXT-X-ENDLIST (VOD marker - should not be in live stream)');
    }

    return NextResponse.json(diagnostics, { status: 200 });

  } catch (error: any) {
    console.error('[Stream Diagnostics] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

