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

  if (!titleId) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  const cacheKey = `sources:${titleId}:${region}`;

  // Check your existing Upstash KV first
  const cached = await kv.get(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true });
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

    // Save to your existing Upstash KV for 24 hours
    await kv.set(cacheKey, responseData, { ex: 86400 });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Title sources error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
