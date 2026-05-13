import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireSuperAdminSession } from '@/app/lib/api-route-auth';

const execAsync = promisify(exec);

const configPath = process.env.MEDIAMTX_CONFIG_PATH || '/tmp/mediamtx.yml';

// Helper: Regenerate MediaMTX config from all cameras in DB
async function regenerateMediaMTXConfig() {
  const cameras = await prisma.camera.findMany({
    where: { streamUrl: { not: null } },
  });
  let config = 'paths:\n';
  for (const cam of cameras) {
    if (!cam.mediamtxPath || !cam.streamUrl) continue;
    config += `  ${cam.mediamtxPath}:\n`;
    config += `    source: ${cam.streamUrl}\n`;
    config += `    sourceProtocol: rtsp\n`;
    config += `    sourceOnDemand: yes\n`;
    config += `    hls: yes\n`;
    config += `    hlsVariant: lowLatency\n`;
  }
  fs.writeFileSync(configPath, config);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession();
    if (!auth.ok) {
      return auth.response;
    }

    const { name, streamUrl, mediamtxPath, worksiteId } = await request.json();
    if (!name || !streamUrl || !mediamtxPath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create camera in DB
    const camera = await prisma.camera.create({
      data: {
        name,
        type: 'IP Camera',
        status: 'active',
        streamUrl,
        mediamtxPath,
        worksiteId,
      },
    });

    // Regenerate MediaMTX config
    await regenerateMediaMTXConfig();

    // Restart MediaMTX
    try {
      await execAsync('docker stop mediamtx || true');
      await execAsync('docker rm mediamtx || true');
      await execAsync('docker run -d --name mediamtx -p 8888:8888 -p 9997:9997 -v /Users/luizcarneiro/mediamtx/mediamtx.yml:/mediamtx.yml bluenviron/mediamtx');
    } catch (e) {
      console.error('Failed to restart MediaMTX:', e);
    }

    return NextResponse.json({
      success: true,
      camera,
      hlsUrl: `http://localhost:8888/${mediamtxPath}/index.m3u8`,
    });
  } catch (error) {
    console.error('Error registering stream:', error);
    return NextResponse.json({ error: 'Failed to register stream' }, { status: 500 });
  }
} 