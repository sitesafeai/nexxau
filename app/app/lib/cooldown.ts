/**
 * In-memory alert cooldown per camera + key (e.g. rule ID or violation type).
 * TODO: Replace with Redis when scaling horizontally.
 */

const cooldowns = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 60_000; // 1 minute — used only when no explicit duration is passed

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

/**
 * @param durationMs Optional explicit cooldown duration in ms. Previously this was
 *   ALWAYS hardcoded to 60s regardless of caller — e.g. CustomRule.cooldownMinutes was
 *   set by the rule builder UI and stored in the DB, but silently ignored here, so every
 *   rule behaved as if it had a fixed 1-minute cooldown no matter what the user configured.
 */
export function setCooldown(cameraId: string, key: string, durationMs: number = DEFAULT_COOLDOWN_MS): void {
  cooldowns.set(`${cameraId}:${key}`, Date.now() + durationMs);
}
