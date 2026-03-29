import { createClient } from '@supabase/supabase-js';

// Service-role client for server-side uploads.
// NOTE: This should only ever run on the server.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[Storage] Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
    return null;
  }
  return createClient(url, key);
}

export async function uploadViolationSnapshot(
  base64: string,
  cameraId: string,
  alertId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(cleaned, 'base64');
    const filename = `${cameraId}/${alertId}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('violation-snapshots')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[Storage] Upload failed:', error);
      return null;
    }

    const { data } = supabase.storage.from('violation-snapshots').getPublicUrl(filename);
    console.log('[Storage] Snapshot uploaded:', data.publicUrl);
    return data.publicUrl;
  } catch (err) {
    console.error('[Storage] Unexpected error uploading snapshot:', err);
    return null;
  }
}

