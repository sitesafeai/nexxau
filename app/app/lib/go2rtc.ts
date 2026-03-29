/**
 * go2rtc API helpers — wraps go2rtcClient for the camera system.
 */

import {
  addStreamToGo2RTC as addStreamClient,
  removeStreamFromGo2RTC as removeStreamClient,
} from './services/go2rtcClient';

const GO2RTC_URL = process.env.GO2RTC_URL ?? 'http://localhost:1984';

export async function addStreamToGo2RTC(cameraId: string, rtspUrl: string): Promise<void> {
  const ok = await addStreamClient(GO2RTC_URL, cameraId, rtspUrl);
  if (!ok) throw new Error('go2rtc stream add failed');
}

export async function removeStreamFromGo2RTC(cameraId: string): Promise<void> {
  await removeStreamClient(GO2RTC_URL, cameraId);
}

export function getWebRTCStreamUrl(cameraId: string): string {
  const base = process.env.NEXT_PUBLIC_GO2RTC_URL ?? 'http://localhost:1984';
  return `${base}/api/webrtc?src=${cameraId}`;
}
