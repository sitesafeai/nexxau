/**
 * In-memory stream state for the simple RTSP viewer.
 * One active stream per server (user enters URL, we stream MJPEG).
 */

let currentRtspUrl: string | null = null;

export function getCurrentRtspUrl(): string | null {
  return currentRtspUrl;
}

export function setCurrentRtspUrl(url: string | null): void {
  currentRtspUrl = url;
}
