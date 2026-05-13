import * as path from 'path';

export function getStreamDirectory(cameraId: string): string {
  const baseDir = process.env.HLS_STREAM_DIR || path.join(process.cwd(), '.hls', 'streams');
  return path.join(baseDir, cameraId);
}
