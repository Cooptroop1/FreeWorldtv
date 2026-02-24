import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const region = searchParams.get('region') || 'US';

  if (!query) {
    return NextResponse.json({ success: false, error: 'Missing search query' }, { status: 400 });
  }

  try {
    // Search by name (no limit/page - Watchmode returns up to ~50 results)
    const searchResult = await client.search.byName(query);

    // Filter to only free titles
    const freeTitles = [];
    const titlesToCheck = Array.isArray(searchResult.data) ? searchResult.data : [];

    for (const title of titlesToCheck) {
      try {
        const sourcesResult = await client.title.getSources(title.id, { regions: region });
        const sources = sourcesResult.data || [];
        const hasFree = sources.some((s: any) => 
          s.type === 'free' || s.price === 0 || s.free_with_ads === true
        );
        if (hasFree) {
          freeTitles.push(title);
        }
      } catch (err) {
        // Skip if source fetch fails
      }
    }

    return NextResponse.json({
      success: true,
      titles: freeTitles,
      totalResults: freeTitles.length,
      message: `Found ${freeTitles.length} free matches for "${query}" in ${region}`,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
