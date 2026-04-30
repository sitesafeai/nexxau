import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireSuperAdminOrInternalToken } from '@/app/lib/internal-route-auth';

const execAsync = promisify(exec);

// POST /api/mediamtx/restart - Restart MediaMTX to apply config changes
export async function POST(request: Request) {
  try {
    const denied = await requireSuperAdminOrInternalToken(request);
    if (denied) return denied;

    console.log('Restarting MediaMTX...');
    
    // Stop and remove existing container
    await execAsync('docker stop mediamtx || true');
    await execAsync('docker rm mediamtx || true');
    
    // Start new container with updated config
    const { stdout, stderr } = await execAsync(
      'docker run -d --name mediamtx -p 8888:8888 -p 9997:9997 -v /Users/luizcarneiro/mediamtx/mediamtx.yml:/mediamtx.yml bluenviron/mediamtx'
    );
    
    console.log('MediaMTX restarted successfully:', stdout);
    
    return NextResponse.json({ 
      success: true, 
      message: 'MediaMTX restarted successfully',
      containerId: stdout.trim()
    });
    
  } catch (error) {
    console.error('Error restarting MediaMTX:', error);
    return NextResponse.json(
      { error: 'Failed to restart MediaMTX' },
      { status: 500 }
    );
  }
} 