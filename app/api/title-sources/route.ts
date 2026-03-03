import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

// Global in-memory cache (24 hours) - shared across all visitors
const sourcesCache = new Map<string, { data: any; timestamp: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get('id');
  const region = searchParams.get('region') || 'US';

  if (!titleId) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  const cacheKey = `${titleId}-${region}`;

  // ← Check cache first (this stops repeated calls)
  const cached = sourcesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return NextResponse.json({
      ...cached.data,
      fromCache: true
    });
  }

  try {
    const result = await client.title.getSources(titleId, {
      regions: region,
    });

    const freeSources = result.data?.filter((source: any) =>
      source.type === 'free' || source.price === 0 || source.free_with_ads === true
    ) || [];

    const responseData = {
      success: true,
      titleId,
      allSources: result.data || [],
      freeSources,
      message: freeSources.length > 0 
        ? `${freeSources.length} free options found!` 
        : 'No free sources in this region'
    };

    // Save to cache for everyone
    sourcesCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Title sources error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
