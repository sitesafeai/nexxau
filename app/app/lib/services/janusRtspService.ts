/**
 * Janus RTSP Integration Service
 * 
 * Provides programmatic management of RTSP camera mounts in Janus Gateway
 * via the Admin API. This service allows the backend to create and destroy
 * RTSP publishers without requiring manual VM configuration.
 * 
 * Usage:
 *   import { createRtspPublisher, destroyRtspPublisher } from '@/app/lib/services/janusRtspService';
 *   
 *   const feedId = await createRtspPublisher('rtsp://camera.example.com/stream');
 *   await destroyRtspPublisher(feedId);
 * 
 * Environment Variables Required:
 *   JANUS_ADMIN_URL - Base URL for Janus Admin API (e.g., "http://localhost:7088/admin")
 *   JANUS_ADMIN_SECRET - Admin secret key (if Janus requires authentication)
 * 
 * Error Handling:
 *   - All functions throw descriptive errors on failure
 *   - Network timeouts set to 10 seconds
 *   - Janus API errors are parsed and re-thrown with context
 */

interface JanusAdminResponse {
  janus: string;
  transaction?: string;
  session_id?: number;
  sender?: number;
  plugindata?: {
    plugin: string;
    data: {
      videoroom?: string;
      room?: number;
      publishers?: Array<{
        id: number;
        display?: string;
        streams?: Array<{
          type: string;
          mindex: number;
        }>;
      }>;
      feed_id?: number;
      mounted?: string;
      rtsp_url?: string;
      mountpoint_id?: number;
      error?: string;
      error_code?: number;
    };
  };
  error?: {
    code: number;
    reason: string;
  };
}

interface JanusGatewayResponse {
  janus: string;
  transaction?: string;
  session_id?: number;
  sender?: number;
  data?: {
    id?: number;
  };
  plugindata?: {
    plugin: string;
    data: Record<string, any>;
  };
  error?: {
    code: number;
    reason: string;
  };
}

interface JanusRtspMountRequest {
  request: 'mount' | 'unmount' | 'list';
  mountpoint_id?: number;
  rtsp_url?: string;
  mountpoint_name?: string;
  options?: {
    video?: boolean;
    audio?: boolean;
    rtsp_user?: string;
    rtsp_pwd?: string;
  };
}

interface JanusStreamingCreateRequest {
  request: 'create' | 'destroy' | 'list';
  id?: number;
  type?: 'rtsp' | 'rtp';
  name?: string;
  description?: string;
  url?: string;
  audio?: boolean;
  video?: boolean;
  videoport?: number;
  videopt?: number;
  videortpmap?: string;
  videocodec?: string;
}

export const generateMountpointId = (): number => {
  const base = Date.now() % 1_000_000_000;
  const random = Math.floor(Math.random() * 1000);
  return Math.min(base + random, 2_147_483_647);
};

interface JanusRtpForwardRequest {
  request: 'rtp_forward' | 'stop_rtp_forward' | 'rtp_forward_stop';
  id?: number;
  mountpoint_id?: number;
  host?: string;
  video_port?: number;
  video_codec?: string;
  video?: boolean;
  audio?: boolean;
  stream_id?: number;
}

/**
 * Get Janus Admin API configuration from environment variables
 */
function getJanusAdminConfig(): { url: string; secret?: string } {
  const adminUrl = process.env.JANUS_ADMIN_URL;
  if (!adminUrl) {
    throw new Error(
      'JANUS_ADMIN_URL environment variable is not set. ' +
      'Please configure it in your .env file (e.g., JANUS_ADMIN_URL=http://localhost:7088/admin)'
    );
  }

  const adminSecret = process.env.JANUS_ADMIN_SECRET;

  return {
    url: adminUrl.replace(/\/$/, ''), // Remove trailing slash
    secret: adminSecret,
  };
}

function getJanusApiConfig(): { url: string } {
  const apiUrl = process.env.JANUS_HTTP_URL;
  if (!apiUrl) {
    throw new Error(
      'JANUS_HTTP_URL environment variable is not set. ' +
      'Please configure it in your .env file (e.g., JANUS_HTTP_URL=http://localhost:8088/janus)'
    );
  }
  return { url: apiUrl.replace(/\/$/, '') };
}

function createTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function janusApiRequest(endpoint: string, body: any): Promise<JanusGatewayResponse> {
  const config = getJanusApiConfig();
  const url = `${config.url}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Janus API request failed: HTTP ${response.status} ${response.statusText}. ${errorText}`);
  }
  const data: JanusGatewayResponse = await response.json();
  if (data.error) {
    throw new Error(`Janus API error: [${data.error.code}] ${data.error.reason}`);
  }
  return data;
}

async function withStreamingHandle<T>(fn: (sessionId: number, handleId: number) => Promise<T>): Promise<T> {
  const createTx = createTransactionId();
  const session = await janusApiRequest('', { janus: 'create', transaction: createTx });
  const sessionId = session.data?.id || session.session_id;
  if (!sessionId) {
    throw new Error('Failed to create Janus session');
  }
  try {
    const attachTx = createTransactionId();
    const attach = await janusApiRequest(`/${sessionId}`, {
      janus: 'attach',
      plugin: 'janus.plugin.streaming',
      transaction: attachTx,
    });
    const handleId = attach.data?.id || attach.sender;
    if (!handleId) {
      throw new Error('Failed to attach to janus.plugin.streaming');
    }
    return await fn(sessionId, handleId);
  } finally {
    const destroyTx = createTransactionId();
    try {
      await janusApiRequest(`/${sessionId}`, { janus: 'destroy', transaction: destroyTx });
    } catch (error) {
      console.warn('[Janus RTSP Service] Failed to destroy Janus session:', (error as Error).message);
    }
  }
}

/**
 * Make a request to Janus Admin API
 * 
 * @param endpoint - Admin API endpoint path (e.g., "/rtsp")
 * @param body - Request body (will be JSON stringified)
 * @param timeoutMs - Request timeout in milliseconds (default: 10000)
 * @returns Parsed JSON response from Janus
 * @throws Error if request fails, times out, or returns an error
 */
async function janusAdminRequest(
  endpoint: string,
  body: any,
  timeoutMs: number = 10000
): Promise<JanusAdminResponse> {
  const config = getJanusAdminConfig();
  const url = `${config.url}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add admin secret if provided (Janus Admin API authentication)
    if (config.secret) {
      headers['Authorization'] = `Bearer ${config.secret}`;
      // Alternative: Some Janus setups use admin_key query parameter
      // If Bearer doesn't work, try: url += `?admin_key=${config.secret}`;
    }

    const transaction = body?.transaction || createTransactionId();
    const payload = body?.janus
      ? {
          transaction,
          ...body,
        }
      : {
          janus: 'message',
          transaction,
          body,
        };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Janus Admin API request failed: HTTP ${response.status} ${response.statusText}. ` +
        `Response: ${errorText}`
      );
    }

    const data: JanusAdminResponse = await response.json();

    // Check for Janus-level errors
    if (data.error) {
      throw new Error(
        `Janus Admin API error: [${data.error.code}] ${data.error.reason}`
      );
    }

    // Check for plugin-level errors
    if (data.plugindata?.data?.error) {
      const pluginData = data.plugindata.data;
      throw new Error(
        `Janus RTSP plugin error: ${pluginData.error} ` +
        `(code: ${pluginData.error_code || 'unknown'})`
      );
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(
        `Janus Admin API request timed out after ${timeoutMs}ms. ` +
        `Check that Janus is running and JANUS_ADMIN_URL is correct.`
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Failed to connect to Janus Admin API at ${url}. ` +
        `Check that Janus is running and JANUS_ADMIN_URL is correct. ` +
        `Original error: ${error.message}`
      );
    }

    // Re-throw our formatted errors
    if (error.message && error.message.startsWith('Janus')) {
      throw error;
    }

    // Wrap unexpected errors
    throw new Error(
      `Unexpected error calling Janus Admin API: ${error.message}`
    );
  }
}

/**
 * Create an RTSP publisher mount in Janus
 * 
 * This function calls the Janus Admin API to create a new RTSP mountpoint,
 * which allows Janus to ingest an RTSP stream and make it available as a
 * WebRTC publisher feed in VideoRoom.
 * 
 * @param rtspUrl - Full RTSP URL (e.g., "rtsp://user:pass@camera.example.com/stream")
 * @returns Promise resolving to the Janus feed ID (mountpoint ID)
 * @throws Error if mount creation fails
 * 
 * @example
 * ```typescript
 * const feedId = await createRtspPublisher('rtsp://192.168.1.100:554/stream1');
 * console.log(`RTSP mount created with feed ID: ${feedId}`);
 * ```
 */
export async function createRtspPublisher(rtspUrl: string): Promise<number> {
  if (!rtspUrl || typeof rtspUrl !== 'string') {
    throw new Error('rtspUrl must be a non-empty string');
  }

  if (!rtspUrl.toLowerCase().startsWith('rtsp://')) {
    throw new Error(
      `Invalid RTSP URL format: "${rtspUrl}". URL must start with "rtsp://"`
    );
  }

  console.log(`[Janus RTSP Service] Creating RTSP mount for: ${rtspUrl}`);

  try {
    return await withStreamingHandle(async (sessionId, handleId) => {
      const requestBody: JanusStreamingCreateRequest = {
        request: 'create',
        type: 'rtsp',
        id: generateMountpointId(),
        name: `rtsp-${Date.now()}`,
        description: 'RTSP camera stream',
        url: rtspUrl,
        video: true,
        audio: true,
      };

      const tx = createTransactionId();
      const response = await janusApiRequest(`/${sessionId}/${handleId}`, {
        janus: 'message',
        body: requestBody,
        transaction: tx,
      });

      const mountpointId =
        response.plugindata?.data?.id ||
        response.plugindata?.data?.mountpoint_id ||
        response.plugindata?.data?.stream?.id;
      if (!mountpointId || typeof mountpointId !== 'number') {
        throw new Error(
          `Janus API response missing mountpoint ID. ` +
          `Response: ${JSON.stringify(response, null, 2)}`
        );
      }

      console.log(
        `[Janus RTSP Service] RTSP mount created successfully with ID: ${mountpointId}`
      );
      return mountpointId;
    });
  } catch (error: any) {
    console.error(
      `[Janus RTSP Service] Failed to create RTSP mount for ${rtspUrl}:`,
      error.message
    );
    throw error;
  }
}

export async function createRtpMountpoint(params: {
  mountpointId?: number;
  videoPort: number;
  videoCodec?: string;
  payloadType?: number;
  name?: string;
  description?: string;
}): Promise<number> {
  const {
    mountpointId = generateMountpointId(),
    videoPort,
    videoCodec = 'h264',
    payloadType = 96,
    name,
    description,
  } = params;

  if (!videoPort || videoPort <= 0) {
    throw new Error('videoPort must be a positive integer');
  }

  // ============================================================
  // PORT VERIFICATION LOGGING
  // ============================================================
  console.log('=== Janus Mountpoint Creation - Port Verification ===');
  console.log('Mountpoint ID:', mountpointId);
  console.log('Video Port:', videoPort);
  console.log('Video Codec:', videoCodec);
  console.log('Payload Type:', payloadType);
  console.log('⚠️ CRITICAL: Janus will listen for RTP packets on port', videoPort);
  console.log('⚠️ CRITICAL: FFmpeg MUST send RTP to this exact port:', videoPort);
  console.log('⚠️ VERIFY: Port calculation matches between services!');

  try {
    return await withStreamingHandle(async (sessionId, handleId) => {
      const requestBody: JanusStreamingCreateRequest = {
        request: 'create',
        type: 'rtp',
        id: mountpointId,
        name: name || `rtp-${mountpointId}`,
        description: description || 'RTP camera stream',
        video: true,
        audio: false,
        videoport: videoPort,
        videopt: payloadType,
        videortpmap: `${videoCodec.toUpperCase()}/90000`,
        videocodec: videoCodec.toLowerCase(),
      };
      
      console.log('Janus mountpoint creation request:', {
        mountpointId,
        videoport: videoPort,
        videopt: payloadType,
        videocodec: videoCodec,
        videortpmap: `${videoCodec.toUpperCase()}/90000`,
      });

      const tx = createTransactionId();
      const response = await janusApiRequest(`/${sessionId}/${handleId}`, {
        janus: 'message',
        body: requestBody,
        transaction: tx,
      });

      // Try multiple possible locations for the mountpoint ID
      const createdId =
        response.plugindata?.data?.id ||
        response.plugindata?.data?.mountpoint_id ||
        response.plugindata?.data?.stream?.id ||
        (response.plugindata?.data?.created ? 
          parseInt(String(response.plugindata.data.created).replace('mp-', '')) : null);
      
      if (!createdId || typeof createdId !== 'number') {
        console.error('[Janus RTSP Service] Full response:', JSON.stringify(response, null, 2));
        throw new Error(
          `Janus API response missing mountpoint ID. ` +
          `Response: ${JSON.stringify(response, null, 2)}`
        );
      }

      console.log(
        `[Janus RTSP Service] RTP mount created successfully with ID: ${createdId}`
      );
      return createdId;
    });
  } catch (error: any) {
    console.error(
      `[Janus RTSP Service] Failed to create RTP mount ${mountpointId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Destroy an RTSP publisher mount in Janus
 * 
 * This function calls the Janus Admin API to remove an RTSP mountpoint,
 * stopping the RTSP stream ingestion and freeing resources.
 * 
 * @param feedId - Janus feed ID (mountpoint ID) returned from createRtspPublisher
 * @returns Promise that resolves when mount is destroyed
 * @throws Error if mount destruction fails
 * 
 * @example
 * ```typescript
 * await destroyRtspPublisher(12345);
 * console.log('RTSP mount destroyed successfully');
 * ```
 */
export async function destroyRtspPublisher(feedId: number): Promise<void> {
  if (!feedId || typeof feedId !== 'number' || feedId <= 0) {
    throw new Error('feedId must be a positive integer');
  }

  console.log(`[Janus RTSP Service] Destroying RTSP mount with feed ID: ${feedId}`);

  try {
    await withStreamingHandle(async (sessionId, handleId) => {
      const requestBody: JanusStreamingCreateRequest = {
        request: 'destroy',
        id: feedId,
      };

      const tx = createTransactionId();
      await janusApiRequest(`/${sessionId}/${handleId}`, {
        janus: 'message',
        body: requestBody,
        transaction: tx,
      });
    });

    console.log(
      `[Janus RTSP Service] RTSP mount destroyed successfully for feed ID: ${feedId}`
    );
  } catch (error: any) {
    console.error(
      `[Janus RTSP Service] Failed to destroy RTSP mount for feed ID ${feedId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * List all active RTSP mounts (utility function for debugging)
 * 
 * This function can be used to check which RTSP mounts are currently active
 * in Janus. Useful for debugging and monitoring.
 * 
 * @returns Promise resolving to array of mount information
 * @throws Error if list request fails
 * 
 * @example
 * ```typescript
 * const mounts = await listRtspMounts();
 * console.log(`Active RTSP mounts: ${mounts.length}`);
 * ```
 */
export async function listRtspMounts(): Promise<Array<{
  mountpoint_id: number;
  rtsp_url: string;
  mounted: string;
}>> {
  console.log('[Janus RTSP Service] Listing RTSP mounts');

  try {
    return await withStreamingHandle(async (sessionId, handleId) => {
      const requestBody: JanusStreamingCreateRequest = {
        request: 'list',
      };

      const tx = createTransactionId();
      const response = await janusApiRequest(`/${sessionId}/${handleId}`, {
        janus: 'message',
        body: requestBody,
        transaction: tx,
      });

      const list = response.plugindata?.data?.list;
      if (!Array.isArray(list)) {
        return [];
      }

      return list.map((item: any) => ({
        mountpoint_id: item.id,
        rtsp_url: item.url || '',
        mounted: item.mounted || 'unknown',
      }));
    });
  } catch (error: any) {
    console.error('[Janus RTSP Service] Failed to list RTSP mounts:', error.message);
    throw error;
  }
}

/**
 * List all streaming mountpoints (for dropdown: id, name, description, type).
 * Used when adding a camera that "displays" an existing Janus stream.
 */
export async function listStreamingStreams(): Promise<Array<{
  id: number;
  name?: string;
  description?: string;
  type?: string;
}>> {
  try {
    return await withStreamingHandle(async (sessionId, handleId) => {
      const tx = createTransactionId();
      const response = await janusApiRequest(`/${sessionId}/${handleId}`, {
        janus: 'message',
        body: { request: 'list' as const },
        transaction: tx,
      });
      const list = response.plugindata?.data?.list;
      if (!Array.isArray(list)) {
        return [];
      }
      return list.map((item: any) => ({
        id: item.id,
        name: item.name ?? item.description ?? `Stream ${item.id}`,
        description: item.description ?? item.name ?? '',
        type: item.type ?? 'rtp',
      }));
    });
  } catch (error: any) {
    console.error('[Janus RTSP Service] Failed to list streaming streams:', error.message);
    throw error;
  }
}

/**
 * Get information about a specific mountpoint
 * 
 * @param mountpointId - The mountpoint ID to query
 * @returns Promise resolving to mountpoint info or null if not found
 */
export async function getMountpointInfo(mountpointId: number): Promise<{
  id: number;
  name?: string;
  description?: string;
  type?: string;
  videoport?: number;
  videopt?: number;
  videocodec?: string;
  [key: string]: any;
} | null> {
  if (!mountpointId || typeof mountpointId !== 'number' || mountpointId <= 0) {
    throw new Error('mountpointId must be a positive integer');
  }

  console.log(`[Janus RTSP Service] Getting info for mountpoint ${mountpointId}`);

  try {
    return await withStreamingHandle(async (sessionId, handleId) => {
      const requestBody: JanusStreamingCreateRequest = {
        request: 'list',
      };

      const tx = createTransactionId();
      const response = await janusApiRequest(`/${sessionId}/${handleId}`, {
        janus: 'message',
        body: requestBody,
        transaction: tx,
      });

      const list = response.plugindata?.data?.list;
      if (!Array.isArray(list)) {
        return null;
      }

      const mountpoint = list.find((item: any) => item.id === mountpointId);
      if (!mountpoint) {
        return null;
      }

      return {
        id: mountpoint.id,
        name: mountpoint.name,
        description: mountpoint.description,
        type: mountpoint.type,
        videoport: mountpoint.videoport,
        videopt: mountpoint.videopt,
        videocodec: mountpoint.videocodec,
        ...mountpoint,
      };
    });
  } catch (error: any) {
    console.error(`[Janus RTSP Service] Failed to get mountpoint info for ${mountpointId}:`, error.message);
    throw error;
  }
}

export async function startRtpForward(params: {
  mountpointId: number;
  host: string;
  port: number;
  codec?: string;
}): Promise<{ streamId?: number }> {
  const { mountpointId, host, port, codec = 'vp8' } = params;
  if (!mountpointId || mountpointId <= 0) {
    throw new Error('mountpointId must be a positive integer');
  }
  if (!host) {
    throw new Error('host is required for RTP forward');
  }
  if (!port || port <= 0) {
    throw new Error('port is required for RTP forward');
  }
  return await withStreamingHandle(async (sessionId, handleId) => {
    const requestBody: JanusRtpForwardRequest = {
      request: 'rtp_forward',
      id: mountpointId,
      mountpoint_id: mountpointId,
      host,
      video_port: port,
      video_codec: codec,
      video: true,
      audio: false,
    };
    const tx = createTransactionId();
    const response = await janusApiRequest(`/${sessionId}/${handleId}`, {
      janus: 'message',
      body: requestBody,
      transaction: tx,
    });
    const streamId = response.plugindata?.data?.stream_id;
    return { streamId: typeof streamId === 'number' ? streamId : undefined };
  });
}

export async function stopRtpForward(params: {
  mountpointId: number;
  streamId?: number;
}): Promise<void> {
  const { mountpointId, streamId } = params;
  if (!mountpointId || mountpointId <= 0) {
    throw new Error('mountpointId must be a positive integer');
  }
  await withStreamingHandle(async (sessionId, handleId) => {
    const requestBody: JanusRtpForwardRequest = streamId
      ? { request: 'stop_rtp_forward', stream_id: streamId }
      : { request: 'rtp_forward_stop', id: mountpointId, mountpoint_id: mountpointId };
    const tx = createTransactionId();
    await janusApiRequest(`/${sessionId}/${handleId}`, {
      janus: 'message',
      body: requestBody,
      transaction: tx,
    });
  });
}
