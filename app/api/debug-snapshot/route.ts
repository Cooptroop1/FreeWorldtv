import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { ALLOWED_REGIONS, catalogKey } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const regions: Record<string, { free: number; premium: number; freeSample: { id: number; title: string; year?: number }[] }> = {};
    let totalFree = 0;
    let totalPremium = 0;

    for (const region of ALLOWED_REGIONS) {
      const freeRaw = await kv.get(catalogKey(false, region));
      const premiumRaw = await kv.get(catalogKey(true, region));
      const free = Array.isArray(freeRaw) ? freeRaw : [];
      const premium = Array.isArray(premiumRaw) ? premiumRaw : [];
      totalFree += free.length;
      totalPremium += premium.length;
      regions[region] = {
        free: free.length,
        premium: premium.length,
        freeSample: free.slice(0, 3).map((t: { id: number; title: string; year?: number }) => ({
          id: t.id,
          title: t.title,
          year: t.year,
        })),
      };
    }

    const lastRefreshRaw = await kv.get('lastFullRefresh');
    let lastRefreshDate = 'never';
    if (lastRefreshRaw) {
      const ts = typeof lastRefreshRaw === 'number' ? lastRefreshRaw : Number(lastRefreshRaw);
      if (!isNaN(ts)) lastRefreshDate = new Date(ts).toISOString();
    }

    return NextResponse.json({
      status: 'SNAPSHOT CHECK',
      catalogKeys: 'free_catalog:{region} / premium_catalog:{region}',
      regions,
      totalFree,
      totalPremium,
      lastFullRefresh: lastRefreshDate,
      advice: totalFree > 1000 ? 'Catalog looks healthy' : 'Run a full refresh if numbers are low',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'KV read failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
