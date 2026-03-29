import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { constants } from 'fs';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// Common paths for ffprobe on different systems
const COMMON_FFPROBE_PATHS = [
  '/opt/homebrew/bin/ffprobe', // macOS Homebrew (Apple Silicon)
  '/usr/local/bin/ffprobe',     // macOS Homebrew (Intel) / Linux
  '/usr/bin/ffprobe',           // Linux system
  'ffprobe',                     // Fallback to PATH
];

/**
 * Find ffprobe executable path
 */
async function findFFprobePath(): Promise<string> {
  // Check environment variable first
  if (process.env.FFPROBE_PATH) {
    try {
      await access(process.env.FFPROBE_PATH, constants.F_OK);
      return process.env.FFPROBE_PATH;
    } catch {
      // Path doesn't exist, continue to common paths
    }
  }

  // Try common paths
  for (const path of COMMON_FFPROBE_PATHS) {
    try {
      if (path === 'ffprobe') {
        // For 'ffprobe', check if it's in PATH by trying to execute it
        try {
          await execAsync('which ffprobe', { timeout: 1000 });
          return 'ffprobe';
        } catch {
          continue;
        }
      } else {
        await access(path, constants.F_OK);
        return path;
      }
    } catch {
      // Path doesn't exist, try next
      continue;
    }
  }

  // Fallback to 'ffprobe' (will fail with better error message)
  return 'ffprobe';
}

export type RtspValidationErrorCode =
  | 'invalid_url'
  | 'timeout'
  | 'auth_failed'
  | 'unsupported_codec'
  | 'fps_too_high'
  | 'resolution_too_high'
  | 'no_video'
  | 'unreachable'
  | 'dns_failed'
  | 'invalid_data'
  | 'probe_failed';

export interface RtspValidationResult {
  ok: boolean;
  error?: RtspValidationErrorCode;
  message?: string;
  stream?: {
    codec: string;
    fps: number;
    width: number;
    height: number;
  };
}

const parseFraction = (value?: string | null): number => {
  if (!value) return 0;
  if (!value.includes('/')) {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }
  const [num, den] = value.split('/');
  const numerator = Number(num);
  const denominator = Number(den);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
};

const mapProbeError = (message: string): RtspValidationErrorCode => {
  const lower = message.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication')) {
    return 'auth_failed';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'timeout';
  }
  if (lower.includes('failed to resolve hostname') || 
      lower.includes('nodename nor servname provided') ||
      lower.includes('name or service not known') ||
      lower.includes('could not resolve host')) {
    return 'dns_failed';
  }
  if (lower.includes('invalid data found when processing input') ||
      lower.includes('invalid data') ||
      lower.includes('input/output error')) {
    return 'invalid_data';
  }
  if (lower.includes('not found') || lower.includes('no route') || lower.includes('refused') || lower.includes('connection refused')) {
    return 'unreachable';
  }
  return 'probe_failed';
};

export async function validateRtspStream(rtspUrl: string): Promise<RtspValidationResult> {
  if (!rtspUrl || typeof rtspUrl !== 'string' || !rtspUrl.trim()) {
    return { ok: false, error: 'invalid_url', message: 'RTSP URL is required' };
  }

  if (!rtspUrl.toLowerCase().startsWith('rtsp://')) {
    return { ok: false, error: 'invalid_url', message: 'RTSP URL must start with rtsp://' };
  }

  const timeoutMs = Number(process.env.RTSP_VALIDATE_TIMEOUT_MS || '5000');
  const timeoutUs = Math.max(1000000, timeoutMs * 1000);
  const maxFps = Number(process.env.RTSP_MAX_FPS || '60'); // Increased to support high FPS phone cameras
  const maxWidth = Number(process.env.RTSP_MAX_WIDTH || '7680'); // 8K width - supports modern phone cameras
  const maxHeight = Number(process.env.RTSP_MAX_HEIGHT || '4320'); // 8K height - supports modern phone cameras
  const ffprobePath = await findFFprobePath();

  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-rtsp_transport',
        'tcp',
        '-timeout',
        `${timeoutUs}`,
        '-select_streams',
        'v:0',
        '-show_streams',
        '-print_format',
        'json',
        rtspUrl,
      ],
      {
        timeout: timeoutMs + 2000,
        maxBuffer: 1024 * 1024,
      }
    );

    const parsed = JSON.parse(stdout || '{}');
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const videoStream = streams.find((stream: any) => stream.codec_type === 'video');

    if (!videoStream) {
      return { ok: false, error: 'no_video', message: 'No video stream detected' };
    }

    const codec = String(videoStream.codec_name || '').toLowerCase();
    if (codec !== 'h264' && codec !== 'hevc' && codec !== 'h265') {
      return { 
        ok: false, 
        error: 'unsupported_codec', 
        message: `Unsupported codec: ${codec || 'unknown'}. This system supports H.264 and H.265/HEVC. If your phone camera uses a different codec, please check your camera settings.` 
      };
    }
    
    // Note: H.265/HEVC will be transcoded to H.264 automatically

    const width = Number(videoStream.width || 0);
    const height = Number(videoStream.height || 0);
    if (width > maxWidth || height > maxHeight) {
      return {
        ok: false,
        error: 'resolution_too_high',
        message: `Resolution too high (${width}x${height})`,
      };
    }

    const fps = parseFraction(videoStream.avg_frame_rate || videoStream.r_frame_rate);
    if (fps > maxFps) {
      return { ok: false, error: 'fps_too_high', message: `FPS too high (${fps.toFixed(1)})` };
    }

    // Build informative message
    let codecMessage = '';
    if (codec === 'hevc' || codec === 'h265') {
      codecMessage = ' (will be transcoded to H.264)';
    }
    
    const message = `Codec: ${codec}${codecMessage}, Resolution: ${width}x${height}, FPS: ${fps.toFixed(1)}`;

    return {
      ok: true,
      stream: {
        codec,
        fps,
        width,
        height,
      },
      message,
    };
  } catch (error: any) {
    let message = error?.stderr || error?.message || 'ffprobe failed';
    
    // Check if it's a "command not found" error
    if (error?.code === 'ENOENT' || message.includes('ENOENT') || message.includes('not found')) {
      return {
        ok: false,
        error: 'probe_failed',
        message: `ffprobe not found. Please install FFmpeg: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux). Tried paths: ${COMMON_FFPROBE_PATHS.join(', ')}`,
      };
    }
    
    const code = mapProbeError(message);
    
    // Provide user-friendly error messages
    let userMessage = message;
    if (code === 'auth_failed') {
      userMessage = 'RTSP authentication failed. Please check your username and password in the RTSP URL. Format: rtsp://username:password@host:port/path';
    } else if (code === 'timeout') {
      userMessage = 'RTSP stream connection timed out. Please check that the camera is online and the URL is correct.';
    } else if (code === 'dns_failed') {
      userMessage = 'Cannot resolve hostname. Please check that the IP address or hostname in the RTSP URL is correct and reachable. Make sure you replace placeholder IPs (like 192.168.X.X) with actual camera IP addresses.';
    } else if (code === 'invalid_data') {
      userMessage = 'Invalid stream data received. The RTSP stream may be corrupted, use an unsupported codec, or the URL path may be incorrect. Please verify the stream URL and ensure the camera supports H.264 encoding.';
    } else if (code === 'unreachable') {
      userMessage = 'Cannot reach RTSP stream. Please check the URL, network connection, and that the camera is online.';
    }
    
    return { ok: false, error: code, message: userMessage };
  }
}
