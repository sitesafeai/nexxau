import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

// POST /api/mediamtx/update-config - Update MediaMTX config with new camera streams
export async function POST(request: NextRequest) {
  try {
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
    const pathBlock = `  ${mediamtxPath}:\n    source: ${rtspUrl}\n    sourceOnDemand: yes\n`;
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

    // Restart MediaMTX to apply new config
    try {
      console.log('Restarting MediaMTX to apply new config...');
      const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
      const rtspPort = process.env.MEDIAMTX_RTSP_PORT || '8554';
      const webrtcPort = process.env.MEDIAMTX_WEBRTC_PORT || '9002';
      const apiPort = process.env.MEDIAMTX_API_PORT || '9000';
      const volumeConfig = `${configPath}:${path.posix.isAbsolute(configPath) ? '/mediamtx.yml' : configPath}`;

      await execAsync('docker stop mediamtx || true');
      await execAsync('docker rm mediamtx || true');
      await execAsync(`docker run -d --name mediamtx \
        -p ${hlsPort}:${hlsPort} \
        -p ${rtspPort}:${rtspPort} \
        -p ${webrtcPort}:${webrtcPort} \
        -p ${apiPort}:${apiPort} \
        -p 9001:9001 \
        -v ${configPath}:/mediamtx.yml \
        bluenviron/mediamtx`);
      console.log('MediaMTX restarted successfully');
    } catch (error) {
      console.error('Error restarting MediaMTX:', error);
      // Don't fail the request if restart fails
    }

    // Compute HLS URL using request host and env port
    const hostHeader = request.headers.get('host') || 'localhost:8888';
    const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
    const publicHost = hostHeader.includes(':') ? hostHeader.split(':')[0] : hostHeader;
    const hlsUrl = `http://${publicHost}:${hlsPort}/live/${mediamtxPath}/index.m3u8`;

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