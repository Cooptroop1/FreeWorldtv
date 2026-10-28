import { NextResponse } from 'next/server';
import { isLiveRegion, liveEventsFor } from '@/lib/live-events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get('region')?.toUpperCase() || 'GB';
  if (!isLiveRegion(region)) {
    return NextResponse.json({ success: true, region, events: [], supported: false });
  }
  const { events, cached } = await liveEventsFor(region);
  return NextResponse.json({ success: true, region, events, cached, supported: true });
}
