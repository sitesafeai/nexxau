import os from 'node:os';
import { metrics } from './metrics';

let rpmBaseline: { total: number; at: number } | null = null;

export interface HttpTrafficSnapshot {
  totalHttpRequests: number;
  requestsPerMinute: number | null;
  rpmPendingBaseline: boolean;
  responses: { ok2xx: number; client4xx: number; server5xx: number };
  rateLimitRejectionsTotal: number;
  rateLimitByLimiter: { limiter: string; count: number }[];
}

export interface SentryPublicInfo {
  configured: boolean;
  environment: string;
  tracesSampleRate: number;
  dashboardUrl: string | null;
}

export interface TrafficStress {
  level: 'normal' | 'elevated' | 'high' | 'unknown';
  hint: string;
}

export function getHostname(): string {
  try {
    return os.hostname();
  } catch {
    return 'unknown';
  }
}

export function getSentryPublicInfo(): SentryPublicInfo {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  const configured = Boolean(dsn && String(dsn).length > 12);
  const org = process.env.SENTRY_ORG_SLUG || process.env.SENTRY_ORG;
  const proj = process.env.SENTRY_PROJECT_SLUG || process.env.SENTRY_PROJECT;

  let dashboardUrl: string | null = null;
  if (org && proj) {
    dashboardUrl = `https://sentry.io/organizations/${encodeURIComponent(org)}/issues/?project=${encodeURIComponent(proj)}`;
  } else if (configured) {
    dashboardUrl = 'https://sentry.io/';
  }

  const tracesSampleRate =
    process.env.SENTRY_TRACES_SAMPLE_RATE != null
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : process.env.NODE_ENV === 'production'
        ? 0.1
        : 1.0;

  return {
    configured,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 1,
    dashboardUrl,
  };
}

export function getHttpTrafficSnapshot(): HttpTrafficSnapshot {
  const data = metrics.httpRequestsTotal.get();
  let totalHttpRequests = 0;
  let ok2xx = 0;
  let client4xx = 0;
  let server5xx = 0;

  for (const v of data.values) {
    totalHttpRequests += v.value;
    const code = parseInt(String(v.labels.status_code), 10);
    if (code >= 200 && code < 300) ok2xx += v.value;
    else if (code >= 400 && code < 500) client4xx += v.value;
    else if (code >= 500) server5xx += v.value;
  }

  const now = Date.now();
  let requestsPerMinute: number | null = null;
  let rpmPendingBaseline = false;

  if (rpmBaseline === null) {
    rpmBaseline = { total: totalHttpRequests, at: now };
    rpmPendingBaseline = true;
  } else {
    const elapsedMin = (now - rpmBaseline.at) / 60_000;
    if (elapsedMin > 0) {
      requestsPerMinute = Math.max(
        0,
        Math.round((totalHttpRequests - rpmBaseline.total) / elapsedMin)
      );
    }
    rpmBaseline = { total: totalHttpRequests, at: now };
  }

  const rl = metrics.rateLimitRejections.get();
  let rateLimitRejectionsTotal = 0;
  const rateLimitByLimiter: { limiter: string; count: number }[] = [];
  for (const v of rl.values) {
    rateLimitRejectionsTotal += v.value;
    rateLimitByLimiter.push({ limiter: v.labels.limiter || 'unknown', count: v.value });
  }
  rateLimitByLimiter.sort((a, b) => b.count - a.count);

  return {
    totalHttpRequests,
    requestsPerMinute,
    rpmPendingBaseline,
    responses: { ok2xx, client4xx, server5xx },
    rateLimitRejectionsTotal,
    rateLimitByLimiter,
  };
}

export function getTrafficStress(
  rpm: number | null,
  rpmPending: boolean,
  rateLimit429Total: number,
  server5xx: number,
  total: number
): TrafficStress {
  if (rpmPending || rpm === null) {
    return {
      level: 'unknown',
      hint: 'Open this tab again or hit Refresh in a few seconds to estimate request rate.',
    };
  }

  const errRate = total > 0 ? server5xx / total : 0;

  if (rpm > 15_000 || (rpm > 2_000 && errRate > 0.2)) {
    return {
      level: 'high',
      hint: 'Very high HTTP volume or error ratio. Check Sentry, upstream proxies, and database load.',
    };
  }

  if (rpm > 5_000 || rateLimit429Total > 30 || (rpm > 2_000 && rateLimit429Total > 10)) {
    return {
      level: 'elevated',
      hint: 'Heavy traffic or many clients hitting rate limits. Watch for abuse, loops, or missing caching.',
    };
  }

  return {
    level: 'normal',
    hint: 'Traffic looks typical for this process snapshot (not global CDN/host uptime).',
  };
}
