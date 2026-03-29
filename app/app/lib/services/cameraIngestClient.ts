interface CameraIngestConfig {
  baseUrl: string;
  timeoutMs: number;
}

function getCameraIngestConfig(): CameraIngestConfig {
  const baseUrl = process.env.CAMERA_INGEST_SERVICE_URL;
  if (!baseUrl) {
    throw new Error(
      'CAMERA_INGEST_SERVICE_URL environment variable is not set. ' +
      'Please configure it in your .env file.'
    );
  }

  const timeoutMs = Number(process.env.CAMERA_INGEST_TIMEOUT_MS || '10000');

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    timeoutMs,
  };
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  let config: CameraIngestConfig;
  try {
    config = getCameraIngestConfig();
  } catch (configError: any) {
    throw new Error(`Camera ingest service configuration error: ${configError.message}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const url = `${config.baseUrl}${path}`;
    console.log(`[cameraIngestClient] Making request to: ${url}`, {
      method: options.method,
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || payload?.error || payload?.message || `HTTP ${response.status}`;
      console.error(`[cameraIngestClient] Request failed:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        payload,
      });
      throw new Error(message);
    }

    console.log(`[cameraIngestClient] Request succeeded:`, { url, payload });
    return payload as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error('Camera ingest request timed out');
    }
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to camera ingest service at ${config.baseUrl}. Is the service running?`);
    }
    if (error?.message) {
      throw error; // Re-throw with the existing message
    }
    throw new Error(`Camera ingest request failed: ${error?.toString() || 'Unknown error'}`);
  }
}

export async function startRtpPush(params: {
  cameraId: string;
  rtspUrl: string;
  mountpointId: number;
  rtpHost: string;
  rtpPort: number;
  payloadType?: number;
  videoCodec?: string;
  inputCodec?: string; // Detected input codec (h264, h265, hevc) - used for codec-aware transcoding
}): Promise<{ success: boolean; data?: any }> {
  const {
    cameraId,
    rtspUrl,
    mountpointId,
    rtpHost,
    rtpPort,
    payloadType,
    videoCodec,
    inputCodec,
  } = params;

  return await request(`/api/v1/cameras/${cameraId}/rtp/start`, {
    method: 'POST',
    body: JSON.stringify({
      rtspUrl,
      mountpointId,
      rtpHost,
      rtpPort,
      payloadType,
      videoCodec,
      inputCodec,
    }),
  });
}

export async function stopRtpPush(params: {
  cameraId: string;
}): Promise<{ success: boolean; data?: any }> {
  const { cameraId } = params;
  return await request(`/api/v1/cameras/${cameraId}/rtp/stop`, {
    method: 'POST',
  });
}

export async function getRtpStreamStatus(cameraId: string): Promise<{ success: boolean; data?: any }> {
  try {
    const response = await request<{ success: boolean; data?: { streams?: Array<{ cameraId: string; [key: string]: any }> } }>('/api/v1/rtp/streams', {
      method: 'GET',
    });

    if (response.success && response.data?.streams) {
      // Find the stream for this camera
      const stream = response.data.streams.find(s => s.cameraId === cameraId);
      if (stream) {
        return {
          success: true,
          data: stream,
        };
      }
    }

    return {
      success: false,
      data: null,
    };
  } catch (error: any) {
    console.error(`[cameraIngestClient] Failed to get RTP stream status for camera ${cameraId}:`, error);
    return {
      success: false,
      data: null,
    };
  }
}

export async function checkServiceAvailability(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy' }> {
  try {
    const config = getCameraIngestConfig();
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { status: 'unhealthy' };
    }

    const health = await response.json();
    return { status: health.status || 'unhealthy' };
  } catch (error) {
    return { status: 'unhealthy' };
  }
}
