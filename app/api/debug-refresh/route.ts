import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lastRefreshRaw = await kv.get('lastFullRefresh');
    const lastRefresh = typeof lastRefreshRaw === 'number' ? lastRefreshRaw : Number(lastRefreshRaw) || 0;
    const now = Date.now();
    const daysSince = lastRefresh > 0 ? ((now - lastRefresh) / 86400000).toFixed(2) : 'never';

    return NextResponse.json({
      lastFullRefresh: lastRefresh > 0 ? new Date(lastRefresh).toISOString() : 'never',
      daysSinceLastFullRefresh: daysSince,
      message: 'Reads lastFullRefresh from KV. Catalog keys are free_catalog:{region}.',
    });
  } catch {
    return NextResponse.json({ error: 'KV read failed' }, { status: 500 });
  }
}
