import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: 'b2HmkbZroSfdahf6vZ12p2xYSggJDjNTzWmNROKv',  // ← your real key
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get('id');  // e.g. ?id=3126906

  if (!titleId) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  try {
    const result = await client.title.getSources(titleId, {
      regions: 'US',  // Start with US; we can add country selector later
    });

    // Filter to only free sources (ad-supported/free tiers)
    const freeSources = result.data.filter((source: any) => 
      source.type === 'free' ||  // Common for FAST
      source.price === 0 || 
      source.free_with_ads === true  // Some fields vary
    );

    return NextResponse.json({ 
      success: true,
      titleId,
      allSources: result.data,      // Full list for debugging
      freeSources,                  // Only free ones
      message: freeSources.length > 0 ? `${freeSources.length} free options found!` : 'No free sources in US region'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}