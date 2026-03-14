import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  const lastRefresh = await kv.get<number>('lastFullRefresh') || 0;
  const now = Date.now();
  const daysSince = ((now - lastRefresh) / (1000 * 60 * 60 * 24)).toFixed(2);
  const daysUntilNext = (7 - parseFloat(daysSince)).toFixed(2);

  return NextResponse.json({
    lastFullRefresh: new Date(lastRefresh).toISOString(),
    daysSinceLastFullRefresh: daysSince,
    daysUntilNextFullSnapshot: daysUntilNext,
    nextFullSnapshotApprox: new Date(now + (parseFloat(daysUntilNext) * 86400000)).toISOString(),
    message: "This is just a debug tool — you can delete the file later if you want."
  });
}
