/**
 * In-memory alert cooldown per camera + key (e.g. rule ID or violation type).
 * TODO: Replace with Redis when scaling horizontally.
 */

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 1 minute

export function isOnCooldown(cameraId: string, key: string): boolean {
  const k = `${cameraId}:${key}`;
  const expiry = cooldowns.get(k);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    cooldowns.delete(k);
    return false;
  }
  return true;
}

export function setCooldown(cameraId: string, key: string): void {
  cooldowns.set(`${cameraId}:${key}`, Date.now() + COOLDOWN_MS);
}
