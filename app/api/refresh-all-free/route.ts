import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'FreeStreamWorld2026';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('key');

  if (secret !== REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY is missing' }, { status: 500 });
  }

  console.log('🚀 REFRESH STARTED — fetching full free catalog...');
  let allTitles: any[] = [];
  let page = 1;
  let totalCalls = 0;
  const seenIds = new Set();

  try {
    while (true) {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US,GB,CA,AU&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      
      console.log(`📄 Fetching page ${page}...`);
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;

      if (!res.ok) {
        console.error(`❌ Page ${page} failed: ${res.status}`);
        break;
      }

      const data = await res.json();
      const pageTitles = data.titles || data.results || [];

      console.log(`✅ Page ${page} returned ${pageTitles.length} titles`);

      if (pageTitles.length === 0) {
        console.log('✅ No more pages — stopping');
        break;
      }

      // Deduplicate
      const uniquePage = pageTitles.filter((t: any) => {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
        return true;
      });

      allTitles = [...allTitles, ...uniquePage];
      console.log(`📊 Total titles so far: ${allTitles.length}`);

      page++;
      await new Promise(r => setTimeout(r, 400)); // respectful delay
    }

    // Save providers too
    const sourcesRes = await fetch(`https://api.watchmode.com/v1/providers/?apiKey=${WATCHMODE_API_KEY}`, { cache: 'no-store' });
    const providersData = await sourcesRes.json();
    const allProviders = providersData.results || providersData || [];

    console.log(`✅ Fetched ${allProviders.length} providers`);

    // FINAL SAVE
    await kv.set('full_free_catalog', allTitles, { ex: 86400 });
    await kv.set('watchmode_providers', allProviders, { ex: 86400 });
    await kv.set('lastFullRefresh', Date.now(), { ex: 86400 });

    console.log(`🎉 SUCCESS — Saved ${allTitles.length} titles!`);

    return NextResponse.json({
      success: true,
      titleCount: allTitles.length,
      providerCount: allProviders.length,
      callsMade: totalCalls,
      message: 'Snapshot is now filled!'
    });

  } catch (error: any) {
    console.error('❌ Refresh crashed:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: 'Refresh failed — check Vercel logs for details'
    }, { status: 500 });
  }
}
