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

  const cacheKey = `sources:${titleId}:${region}:${paid ? 'paid' : 'free'}`;

  // === 24h SHARED CACHE (first check) ===
  const cached = await kv.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true });
  }

  try {
    const result = await client.title.getSources(titleId, {
      regions: region,
    });

    let sourcesData: any[] = [];
    let message = '';

    if (paid) {
      // Paid / Subscription sources only
      sourcesData = result.data?.filter((source: any) =>
        source.type === 'sub' ||
        source.subscription === true ||
        (source.price && source.price > 0)
      ) || [];
      message = sourcesData.length > 0
        ? `${sourcesData.length} subscription options found!`
        : 'No subscription sources available in this region right now';
    } else {
      // Free sources only
      sourcesData = result.data?.filter((source: any) =>
        source.type === 'free' || source.price === 0 || source.free_with_ads === true
      ) || [];
      message = sourcesData.length > 0
        ? `${sourcesData.length} free options found!`
        : 'No free sources available in this region right now';
    }

    const responseData = {
      success: true,
      titleId,
      allSources: result.data || [],
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      message,
      isPaidTab: paid,
      fromCache: false
    };

    // Save to 24h KV cache (shared for everyone)
    await kv.set(cacheKey, responseData, { ex: 86400 });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Title sources error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch sources'
    }, { status: 500 });
  }
}
