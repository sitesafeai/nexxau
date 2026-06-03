/**
 * Client for MediaMTX HTTP API
 * Manages streams via REST API.
 */

function authHeaders(): HeadersInit {
  const user = process.env.MEDIAMTX_API_USERNAME || 'admin';
  const pass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
  const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${encoded}`,
  };
}

function normalizeRtspSourceForMediaMTX(rtspUrl: string): string {
  // When MediaMTX runs in Docker locally, host loopback/gateway addresses can be
  // unreachable from the container. Route them through host.docker.internal.
  const dockerLocalApi =
    (process.env.MEDIAMTX_API_URL || 'http://localhost:9000').includes('localhost') ||
    (process.env.MEDIAMTX_API_URL || '').includes('127.0.0.1');
  if (!dockerLocalApi) return rtspUrl;

  return rtspUrl
    .replace(/^rtsp:\/\/localhost(?=[:/]|$)/i, 'rtsp://host.docker.internal')
    .replace(/^rtsp:\/\/127\.0\.0\.1(?=[:/]|$)/i, 'rtsp://host.docker.internal')
    .replace(/^rtsp:\/\/172\.20\.10\.1(?=[:/]|$)/i, 'rtsp://host.docker.internal');
}

export async function addStreamToMediaMTX(
  baseUrl: string,
  streamId: string,
  rtspUrl: string
): Promise<boolean> {
  try {
    const sourceUrl = normalizeRtspSourceForMediaMTX(rtspUrl);
    const check = await fetch(`${baseUrl}/v3/config/paths/get/${streamId}`, {
      headers: authHeaders(),
    });
    if (check.ok) {
      console.log(`[mediamtx] Stream already exists: ${streamId}`);
      return true;
    }

    const response = await fetch(`${baseUrl}/v3/config/paths/add/${streamId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source: sourceUrl,
        sourceOnDemand: true,
      }),
    });

    if (response.ok) {
      console.log(`[mediamtx] Stream added: ${streamId} -> ${sourceUrl}`);
      return true;
    } else {
      const text = await response.text();
      console.error(`[mediamtx] Failed to add stream: ${response.status}`, text);
      return false;
    }
  } catch (error) {
    console.error('[mediamtx] Error adding stream:', error);
    return false;
  }
}

export function getMediaMTXHLSUrl(streamId: string): string {
  // If a public HLS origin is set, point the browser directly at MediaMTX —
  // bypassing the Next.js proxy so HLS segment fetches don't compete with
  // API requests on the same container (which caused video freezes on detection).
  const publicOrigin = process.env.NEXT_PUBLIC_MEDIAMTX_HLS_ORIGIN;
  if (publicOrigin) {
    const user = process.env.NEXT_PUBLIC_MEDIAMTX_HLS_USER || '';
    const pass = process.env.NEXT_PUBLIC_MEDIAMTX_HLS_PASS || '';
    const base = publicOrigin.replace(/\/$/, '');
    if (user && pass) {
      // embed credentials in URL for direct browser fetch
      const proto = base.startsWith('https') ? 'https' : 'http';
      const host = base.replace(/^https?:\/\//, '');
      return `${proto}://${user}:${pass}@${host}/${streamId}/index.m3u8`;
    }
    return `${base}/${streamId}/index.m3u8`;
  }
  // Fallback: proxy through Next.js (adds latency but always works)
  return `/api/hls/${streamId}/index.m3u8`;
}

export function getMediaMTXRtspPushUrl(streamId: string): string {
  const base = (process.env.MEDIAMTX_RTSP_PUBLIC_URL || '').replace(/\/$/, '');
  const user = process.env.MEDIAMTX_API_USERNAME || 'admin';
  const pass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
  if (!base) return '';
  try {
    const url = new URL(base);
    url.username = user;
    url.password = pass;
    url.pathname = `/${streamId}`;
    return url.toString();
  } catch {
    return `${base}/${streamId}`;
  }
}

export async function registerPublisherPath(
  baseUrl: string,
  streamId: string
): Promise<boolean> {
  try {
    const check = await fetch(`${baseUrl}/v3/config/paths/get/${streamId}`, {
      headers: authHeaders(),
    });
    if (check.ok) {
      console.log(`[mediamtx] Publisher path already exists: ${streamId}`);
      return true;
    }

    const response = await fetch(`${baseUrl}/v3/config/paths/add/${streamId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ source: 'publisher' }),
    });

    if (response.ok) {
      console.log(`[mediamtx] Publisher path registered: ${streamId}`);
      return true;
    } else {
      const text = await response.text();
      console.error(`[mediamtx] Failed to register publisher path: ${response.status}`, text);
      return false;
    }
  } catch (error) {
    console.error('[mediamtx] Error registering publisher path:', error);
    return false;
  }
}

export async function healthCheckMediaMTX(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/v3/paths/list`, { headers: authHeaders() });
    return response.ok;
  } catch {
    return false;
  }
}

export async function removeStreamFromMediaMTX(
  baseUrl: string,
  streamId: string
): Promise<boolean> {
  try {
    // MediaMTX API has changed across versions; try POST first, then DELETE fallback.
    let response = await fetch(`${baseUrl}/v3/config/paths/delete/${streamId}`, {
      method: 'POST',
      headers: authHeaders(),
    });

    if (!response.ok) {
      response = await fetch(`${baseUrl}/v3/config/paths/delete/${streamId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    }

    if (response.ok) {
      console.log(`[mediamtx] Stream removed: ${streamId}`);
      return true;
    }

    const text = await response.text().catch(() => '');
    console.warn(`[mediamtx] Failed to remove stream ${streamId}: ${response.status} ${text}`);
    return false;
  } catch (error) {
    console.warn('[mediamtx] Error removing stream (continuing):', error);
    return false;
  }
}
