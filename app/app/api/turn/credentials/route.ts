import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.TURN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'TURN_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://nexxau.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { error: 'Failed to fetch TURN credentials', details: text },
        { status: 502 }
      );
    }

    const iceServers = await response.json();
    return NextResponse.json({ iceServers });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'TURN fetch failed', details: error.message },
      { status: 502 }
    );
  }
}
