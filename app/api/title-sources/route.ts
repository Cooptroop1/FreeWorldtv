import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { WatchmodeClient } from '@watchmode/api-client';
import { isAllowedRegion } from '@/lib/regions';

export const dynamic = 'force-dynamic';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

function isFreeSource(s: any) {
  return s.type === 'free' || s.price === 0 || s.free_with_ads === true;
}

function isPaidSource(s: any) {
  return s.type === 'sub' || s.subscription === true || (!!s.price && s.price > 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get('id');
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const region = isAllowedRegion(regionRaw) ? regionRaw : 'GB';
  const paid = searchParams.get('paid') === 'true';

  if (!titleId || !/^\d+$/.test(titleId)) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  const cacheKey = `sources:${titleId}:${region}`;
  const cachedFull = await kv.get<unknown[]>(cacheKey);
  if (cachedFull && Array.isArray(cachedFull)) {
    const sourcesData = paid
      ? cachedFull.filter((s) => isPaidSource(s))
      : cachedFull.filter((s) => isFreeSource(s));
    return NextResponse.json({
      success: true,
      titleId,
      allSources: cachedFull,
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      fromCache: true,
    });
  }

  try {
    const result = await client.title.getSources(titleId, { regions: region });
    const fullSources = result.data || [];
    const sourcesData = paid
      ? fullSources.filter((s: any) => isPaidSource(s))
      : fullSources.filter((s: any) => isFreeSource(s));

    await kv.set(cacheKey, fullSources, { ex: 86400 * 30 });

    return NextResponse.json({
      success: true,
      titleId,
      allSources: fullSources,
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      fromCache: false,
    });
  } catch (error: unknown) {
    console.error('Title sources error:', error);
    await kv.set(cacheKey, [], { ex: 3600 });
    const message = error instanceof Error ? error.message : 'Failed to fetch sources';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
