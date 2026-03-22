import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get('id');
  const region = searchParams.get('region') || 'US';
  const paid = searchParams.get('paid') === 'true';

  if (!titleId) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  // === UPDATED: single cache key for FULL sources (saves 50% of calls) ===
  const cacheKey = `sources:${titleId}:${region}`;   // no paid/free in key
  const callTime = new Date().toISOString();

  // === 30-DAY CACHE CHECK ===
  const cachedFull = await kv.get<any[]>(cacheKey);
  if (cachedFull) {
    console.log(`[${callTime}] CACHE HIT – sources for title ${titleId} (${region})`);
    
    // Filter on-the-fly for whichever tab the user asked
    const sourcesData = paid
      ? cachedFull.filter((s: any) => s.type === 'sub' || s.subscription === true || (s.price && s.price > 0))
      : cachedFull.filter((s: any) => s.type === 'free' || s.price === 0 || s.free_with_ads === true);

    const responseData = {
      success: true,
      titleId,
      allSources: cachedFull,
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      message: sourcesData.length > 0
        ? `${sourcesData.length} ${paid ? 'subscription' : 'free'} options found!`
        : `No ${paid ? 'subscription' : 'free'} sources available in this region right now`,
      isPaidTab: paid,
      fromCache: true
    };

    return NextResponse.json(responseData);
  }

  console.log(`[${callTime}] CACHE MISS – calling Watchmode for title ${titleId} (${region})`);

  try {
    const result = await client.title.getSources(titleId, { regions: region });
    const fullSources = result.data || [];

    // Filter for the current tab
    const sourcesData = paid
      ? fullSources.filter((s: any) => s.type === 'sub' || s.subscription === true || (s.price && s.price > 0))
      : fullSources.filter((s: any) => s.type === 'free' || s.price === 0 || s.free_with_ads === true);

    const responseData = {
      success: true,
      titleId,
      allSources: fullSources,
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      message: sourcesData.length > 0
        ? `${sourcesData.length} ${paid ? 'subscription' : 'free'} options found!`
        : `No ${paid ? 'subscription' : 'free'} sources available in this region right now`,
      isPaidTab: paid,
      fromCache: false
    };

    // === UPDATED: cache FULL sources for 30 days ===
    await kv.set(cacheKey, fullSources, { ex: 86400 * 30 });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Title sources error:', error);
    
    // Tiny safety: cache empty result for 1 hour so we don't retry spam
    await kv.set(cacheKey, [], { ex: 3600 });

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch sources'
    }, { status: 500 });
  }
}
