import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

const execAsync = promisify(exec);

// POST /api/mediamtx/restart - Restart MediaMTX to apply config changes
export async function POST() {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  try {
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