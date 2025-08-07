import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const prisma = new PrismaClient();
const execAsync = promisify(exec);
const configPath = '/Users/luizcarneiro/mediamtx/mediamtx.yml';

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Remove camera from DB
    await prisma.camera.delete({ where: { id: params.id } });

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

    return NextResponse.json({ success: true, message: 'Stream removed and MediaMTX updated.' });
  } catch (error) {
    console.error('Error removing stream:', error);
    return NextResponse.json({ error: 'Failed to remove stream' }, { status: 500 });
  }
} 