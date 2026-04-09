import { NextResponse } from 'next/server';
import { getSystemConfig } from '@/app/lib/system-config-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { homeBanner } = getSystemConfig();
    return NextResponse.json({
      enabled: homeBanner.enabled,
      message: homeBanner.message,
    });
  } catch (error) {
    console.error('Failed to fetch home banner config:', error);
    return NextResponse.json({ enabled: false, message: '' }, { status: 500 });
  }
}
