import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdminSession } from '@/app/lib/api-route-auth';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/mediamtx/update-config - Update MediaMTX config with new camera streams
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession();
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const { cameraId, rtspUrl, mediamtxPath } = body as {
      cameraId?: string;
      rtspUrl: string;
      mediamtxPath: string;
    };

    // Resolve config path from env or fallback
    const configPath = process.env.MEDIAMTX_CONFIG_PATH || '/Users/luizcarneiro/nexxau/mediamtx.yml';
    let config = '';
    
    try {
      config = fs.readFileSync(configPath, 'utf8');
    } catch (error) {
      console.error('Error reading MediaMTX config:', error);
      return NextResponse.json(
        { error: 'Failed to read MediaMTX config' },
        { status: 500 }
      );
    }

    // Ensure YAML contains a 'paths:' root; then append under it
    const hasPathsRoot = /(^|\n)\s*paths\s*:/m.test(config);
    // MediaMTX auto-detects RTSP from rtsp:// URL
    // CRITICAL: Must explicitly enable HLS for the path, otherwise MediaMTX won't generate HLS segments
    const pathBlock = `  ${mediamtxPath}:\n    source: ${rtspUrl}\n    sourceOnDemand: yes\n    sourceOnDemandStartTimeout: 10s\n    sourceOnDemandCloseAfter: 10s\n    hls: yes\n    hlsVariant: lowLatency\n`;
    const newPathConfig = hasPathsRoot
      ? `\n${pathBlock}`
      : `\npaths:\n${pathBlock}`;

    // Add new path to config
    const updatedConfig = config + newPathConfig;

    // Write updated config
    try {
      fs.writeFileSync(configPath, updatedConfig);
    } catch (error) {
      console.error('Error writing MediaMTX config:', error);
      return NextResponse.json(
        { error: 'Failed to write MediaMTX config' },
        { status: 500 }
      );
    }

    // Update camera with MediaMTX path
    if (cameraId) {
      await prisma.camera.update({
        where: { id: cameraId },
        data: {
          mediamtxPath: mediamtxPath,
        },
      });
    }

    // Reload MediaMTX config (MediaMTX supports hot-reload via API)
    try {
      console.log('Reloading MediaMTX config...');
      // MediaMTX supports config reload via API without restart
      const reloadResponse = await fetch('http://localhost:9000/v3/config/reload', {
        method: 'POST',
      }).catch(() => null);
      
      if (reloadResponse?.ok) {
        console.log('MediaMTX config reloaded successfully via API');
      } else {
        // Fallback: Restart MediaMTX binary process
        console.log('API reload failed, restarting MediaMTX process...');
        await execAsync('pkill -f "mediamtx.*mediamtx.yml" || true');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for process to stop
        
        // Start MediaMTX in background
        const mediamtxPath = process.env.MEDIAMTX_BINARY_PATH || 'mediamtx';
        await execAsync(`cd ${path.dirname(configPath)} && nohup ${mediamtxPath} ${path.basename(configPath)} > /tmp/mediamtx.log 2>&1 &`);
        console.log('MediaMTX restarted successfully');
      }
    } catch (error) {
      console.error('Error reloading/restarting MediaMTX:', error);
      // Don't fail the request if restart fails
    }

    // Compute HLS URL using request host and env port
    // MediaMTX serves HLS at /{path}/index.m3u8 (not /live/{path}/index.m3u8)
    const hostHeader = request.headers.get('host') || 'localhost:8888';
    const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
    const publicHost = hostHeader.includes(':') ? hostHeader.split(':')[0] : hostHeader;
    const hlsUrl = `http://${publicHost}:${hlsPort}/${mediamtxPath}/index.m3u8`;

    // Persist hlsUrl on the camera if cameraId provided
    if (cameraId) {
      try {
        await prisma.camera.update({
          where: { id: cameraId },
          data: { hlsUrl },
        });
      } catch (e) {
        console.error('Failed updating camera hlsUrl', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'MediaMTX config updated and restarted',
      mediamtxPath,
      hlsUrl
    });

  } catch (error) {
    console.error('Error updating MediaMTX config:', error);
    return NextResponse.json(
      { error: 'Failed to update MediaMTX config' },
      { status: 500 }
    );
  }
} 