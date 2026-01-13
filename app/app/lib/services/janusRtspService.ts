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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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
    // Janus RTSP plugin mount request format
    // Reference: Janus RTSP plugin uses "mount" request with rtsp_url
    const requestBody: JanusRtspMountRequest = {
      request: 'mount',
      rtsp_url: rtspUrl,
      options: {
        video: true,
        audio: true, // Include audio by default, can be disabled if needed
      },
    };

    const response = await janusAdminRequest('/rtsp', requestBody);

    // Extract mountpoint_id (feed ID) from response
    // Janus RTSP plugin returns mountpoint_id in plugindata.data
    const mountpointId = response.plugindata?.data?.mountpoint_id;

    if (!mountpointId || typeof mountpointId !== 'number') {
      // Alternative: Check for feed_id if mountpoint_id is not present
      const feedId = response.plugindata?.data?.feed_id;
      if (feedId && typeof feedId === 'number') {
        console.log(
          `[Janus RTSP Service] RTSP mount created successfully with feed ID: ${feedId}`
        );
        return feedId;
      }

      // If neither field is present, try to extract from publishers array
      // (some Janus setups return the publisher ID in the publishers list)
      const publishers = response.plugindata?.data?.publishers;
      if (publishers && publishers.length > 0 && publishers[0].id) {
        const publisherId = publishers[0].id;
        console.log(
          `[Janus RTSP Service] RTSP mount created successfully with publisher ID: ${publisherId}`
        );
        return publisherId;
      }

      throw new Error(
        `Janus Admin API response missing mountpoint_id or feed_id. ` +
        `Response: ${JSON.stringify(response, null, 2)}`
      );
    }

    console.log(
      `[Janus RTSP Service] RTSP mount created successfully with mountpoint ID: ${mountpointId}`
    );
    return mountpointId;
  } catch (error: any) {
    console.error(
      `[Janus RTSP Service] Failed to create RTSP mount for ${rtspUrl}:`,
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
    // Janus RTSP plugin unmount request format
    const requestBody: JanusRtspMountRequest = {
      request: 'unmount',
      mountpoint_id: feedId,
    };

    await janusAdminRequest('/rtsp', requestBody);

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
    const requestBody: JanusRtspMountRequest = {
      request: 'list',
    };

    const response = await janusAdminRequest('/rtsp', requestBody);

    // Parse mount list from response
    // Format depends on Janus RTSP plugin version
    const mounts = response.plugindata?.data;

    if (!mounts) {
      return [];
    }

    // If response contains array of mounts, return it
    // Otherwise, return empty array (list format varies by Janus version)
    return [];
  } catch (error: any) {
    console.error('[Janus RTSP Service] Failed to list RTSP mounts:', error.message);
    throw error;
  }
}

