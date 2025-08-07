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
    const { cameraId, rtspUrl, mediamtxPath } = body;

    // Read current MediaMTX config
    const configPath = '/Users/luizcarneiro/mediamtx/mediamtx.yml';
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

    // Parse YAML (simple parsing for this example)
    const lines = config.split('\n');
    const newPathConfig = `  ${mediamtxPath}:
    source: ${rtspUrl}
    sourceOnDemand: yes`;

    // Add new path to config
    const updatedConfig = config + '\n' + newPathConfig;

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
      await execAsync('docker stop mediamtx || true');
      await execAsync('docker rm mediamtx || true');
      await execAsync('docker run -d --name mediamtx -p 8888:8888 -p 9997:9997 -v /Users/luizcarneiro/mediamtx/mediamtx.yml:/mediamtx.yml bluenviron/mediamtx');
      console.log('MediaMTX restarted successfully');
    } catch (error) {
      console.error('Error restarting MediaMTX:', error);
      // Don't fail the request if restart fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'MediaMTX config updated and restarted',
      mediamtxPath,
      hlsUrl: `http://localhost:8888/live/${mediamtxPath}/index.m3u8`
    });

  } catch (error) {
    console.error('Error updating MediaMTX config:', error);
    return NextResponse.json(
      { error: 'Failed to update MediaMTX config' },
      { status: 500 }
    );
  }
} 