import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { activeRegions } from '@/lib/watchmode-plan';
import { buildFranchiseSets } from '@/lib/franchises';
import { cachedWatchmodePage } from '@/lib/wall-fallback';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const region = activeRegions().includes(regionRaw) ? regionRaw : 'GB';
  const paid = searchParams.get('paid') === 'true';
  const key = `franchise_sets:${paid ? 'premium' : 'free'}:${region}`;

  try {
    const cached = await kv.get(key);
    if (Array.isArray(cached) && cached.length) {
      return NextResponse.json({ success: true, region, paid, franchises: cached, fromCache: true });
    }
  } catch {
    /* Redis capped — fall through to a small Watchmode page */
  }

  const list = await cachedWatchmodePage(region, paid, 1);
  return NextResponse.json({
    success: true,
    region,
    paid,
    catalogSize: list.length,
    franchises: buildFranchiseSets(list),
    fromCache: false,
  });
}
