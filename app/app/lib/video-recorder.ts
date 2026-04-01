'use server';

import type { Camera } from '@/app/lib/camera-store';

const FALLBACK_CLIP_URL =
  process.env.DEFAULT_CLIP_SOURCE ||
  'https://res.cloudinary.com/demo/video/upload/dog.mp4';

/**
 * Attempt to capture a short clip from the camera stream.
 * For now we fallback to downloading a placeholder clip.
 */
export async function captureCameraClip(
  camera: Pick<Camera, 'id' | 'name' | 'streamUrl'>,
  durationSeconds: number = Number(process.env.VIDEO_CLIP_DURATION || 20)
): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const sourceUrl = resolveSourceUrl(camera.streamUrl);

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      console.warn(
        `⚠️ Unable to download clip from ${sourceUrl}. Status ${response.status}`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `${camera.id}-${Date.now()}-${durationSeconds}s.mp4`;

    return { buffer, filename };
  } catch (error) {
    console.error('Failed to capture camera clip:', error);
    return null;
  }
}

function resolveSourceUrl(streamUrl?: string | null): string {
  if (!streamUrl) {
    return FALLBACK_CLIP_URL;
  }

  const lowered = streamUrl.toLowerCase();
  const supported = lowered.endsWith('.mp4') || lowered.endsWith('.mov');

  if (supported) {
    return streamUrl;
  }

  // Future improvement: support HLS -> MP4 conversion
  return FALLBACK_CLIP_URL;
}

