import crypto from 'crypto';

/**
 * Signed links for alert snapshots in emails.
 *
 * /api/alerts/[id]/snapshot now requires a signed-in user who can access the alert.
 * Email clients can't sign in (and Gmail proxies images through its own servers), so
 * emailed <img> links carry ?t=<HMAC of the alert id> instead. The token is per-alert
 * and unguessable; it does not expire, so old alert emails keep showing their image.
 *
 * Keyed by SNAPSHOT_SIGNING_SECRET if set, else NEXTAUTH_SECRET. Rotating that secret
 * breaks images in every email already sent — that's the trade-off for revocation.
 */
function signingSecret(): string {
  const s = process.env.SNAPSHOT_SIGNING_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('snapshot-token: no SNAPSHOT_SIGNING_SECRET or NEXTAUTH_SECRET set');
  return s;
}

export function signSnapshot(alertId: string): string {
  return crypto
    .createHmac('sha256', signingSecret())
    .update(`alert-snapshot:${alertId}`)
    .digest('base64url')
    .slice(0, 32);
}

export function verifySnapshotToken(alertId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const expected = Buffer.from(signSnapshot(alertId));
    const given = Buffer.from(token);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/** Absolute, signed snapshot URL for use in emails. */
export function signedSnapshotUrl(alertId: string, appUrl: string): string {
  return `${appUrl.replace(/\/$/, '')}/api/alerts/${alertId}/snapshot?t=${signSnapshot(alertId)}`;
}
