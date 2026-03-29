/**
 * Client for go2rtc HTTP API
 * 
 * Manages streams in go2rtc gateway via REST API.
 */

export async function addStreamToGo2RTC(
  baseUrl: string,
  streamId: string,
  rtspUrl: string
): Promise<boolean> {
  try {
    const url = new URL(`${baseUrl}/api/streams`);
    url.searchParams.set('src', rtspUrl);
    url.searchParams.set('name', streamId);
    const response = await fetch(url.toString(), { method: 'PUT' });

    if (response.ok) {
      console.log(`[go2rtc] Stream added: ${streamId} -> ${rtspUrl}`);
      return true;
    } else {
      const text = await response.text();
      console.error(`[go2rtc] Failed to add stream: ${response.status}`, text);
      return false;
    }
  } catch (error) {
    console.error('[go2rtc] Error adding stream:', error);
    return false;
  }
}

export async function removeStreamFromGo2RTC(
  baseUrl: string,
  streamId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        streams: {
          [streamId]: null
        }
      }),
    });
    
    if (response.ok) {
      console.log(`[go2rtc] Stream removed: ${streamId}`);
      return true;
    } else {
      console.error(`[go2rtc] Failed to remove stream: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[go2rtc] Error removing stream:', error);
    return false;
  }
}

export function getGo2RTCWebRTCUrl(baseUrl: string, streamId: string): string {
  return `${baseUrl}/api/webrtc?src=${streamId}`;
}

export function getGo2RTCHLSUrl(baseUrl: string, streamId: string): string {
  return `${baseUrl}/api/stream.m3u8?src=${streamId}`;
}

export async function listGo2RTCStreams(baseUrl: string): Promise<Record<string, string[]> | null> {
  try {
    const response = await fetch(`${baseUrl}/api/config`);
    
    if (response.ok) {
      const config = await response.json();
      return config.streams || {};
    } else {
      console.error(`[go2rtc] Failed to list streams: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('[go2rtc] Error listing streams:', error);
    return null;
  }
}

export async function healthCheckGo2RTC(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/`);
    return response.ok;
  } catch (error) {
    console.error('[go2rtc] Health check failed:', error);
    return false;
  }
}
