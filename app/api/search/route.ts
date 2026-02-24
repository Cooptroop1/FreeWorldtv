import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: 'b2HmkbZroSfdahf6vZ12p2xYSggJDjNTzWmNROKv',  // ← PASTE YOUR REAL KEY HERE
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const region = searchParams.get('region') || 'US';
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!query) {
    return NextResponse.json({ success: false, error: 'Missing search query' }, { status: 400 });
  }

  try {
    console.log(`[SEARCH] Starting for query: "${query}", page ${page}, region ${region}`);

    // Step 1: Search titles
    const searchResult = await client.search.byName(query, {
      limit: 20,
      page,
    });

    console.log('[SEARCH] Raw search result count:', searchResult.data?.length || 0);

    // Step 2: Filter to free only
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
        console.error(`[SEARCH] Source check failed for title ${title.id} (${title.name || 'unknown'}):`, err.message);
      }
    }

    console.log('[SEARCH] Free titles after filter:', freeTitles.length);

    return NextResponse.json({
      success: true,
      titles: freeTitles,
      page,
      totalPages: Math.ceil(freeTitles.length / 20) || 1,
      totalResults: freeTitles.length,
      message: `Found ${freeTitles.length} free matches for "${query}" in ${region}`,
    });
  } catch (error: any) {
    console.error('[SEARCH ROUTE CRASH]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during search' },
      { status: 500 }
    );
  }
}