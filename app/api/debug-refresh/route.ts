import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const lastRefreshRaw = await kv.get('lastFullRefresh');
    const lastRefresh = typeof lastRefreshRaw === 'number' 
      ? lastRefreshRaw 
      : (Number(lastRefreshRaw) || 0);

    const now = Date.now();
    const daysSince = ((now - lastRefresh) / (1000 * 60 * 60 * 24)).toFixed(2);
    const daysUntilNext = (7 - parseFloat(daysSince)).toFixed(2);

    return NextResponse.json({
      lastFullRefresh: lastRefresh > 0 ? new Date(lastRefresh).toISOString() : 'never',
      daysSinceLastFullRefresh: daysSince,
      daysUntilNextFullSnapshot: daysUntilNext,
      nextFullSnapshotApprox: new Date(now + (parseFloat(daysUntilNext) * 86400000)).toISOString(),
      message: "Debug from KV — matches production timer"
    });
  } catch (e) {
    return NextResponse.json({ error: 'KV read failed' }, { status: 500 });
  }
}
