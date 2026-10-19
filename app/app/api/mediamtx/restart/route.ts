import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/mediamtx/restart - Restart MediaMTX to apply config changes
export async function POST() {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session?.user || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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