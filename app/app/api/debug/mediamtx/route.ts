import { NextResponse } from 'next/server';

export async function GET() {
  const hlsOrigin = (process.env.MEDIAMTX_HLS_ORIGIN || 'http://localhost:8888').replace(/\/$/, '');
  const apiUrl = (process.env.MEDIAMTX_API_URL || 'http://localhost:9000');
  const user = process.env.MEDIAMTX_API_USERNAME || 'admin';
  const pass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}` };

  const results: Record<string, any> = {
    config: { hlsOrigin, apiUrl, user }
  };

  // Check mediamtx API - list paths
  try {
    const r = await fetch(`${apiUrl}/v3/paths/list`, { headers, cache: 'no-store' });
    results.pathsApi = { status: r.status, body: await r.json().catch(() => r.text()) };
  } catch (e: any) {
    results.pathsApi = { error: e.message };
  }

  // Check HLS for teststream
  try {
    const r = await fetch(`${hlsOrigin}/teststream/index.m3u8`, { headers, cache: 'no-store' });
    const body = await r.text();
    results.hlsTeststream = { status: r.status, body: body.slice(0, 500) };
  } catch (e: any) {
    results.hlsTeststream = { error: e.message };
  }

  return NextResponse.json(results);
}
