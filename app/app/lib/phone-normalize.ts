/** Minimal normalization for Twilio (E.164-style). */
export function normalizePhoneInput(raw: string): string | null {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) return null;
  if (t.startsWith('+')) {
    const rest = t.slice(1).replace(/\D/g, '');
    return rest.length >= 10 ? `+${rest}` : null;
  }
  const d = t.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length >= 11 && d.startsWith('1')) return `+${d}`;
  if (d.length >= 10) return `+${d}`;
  return null;
}
