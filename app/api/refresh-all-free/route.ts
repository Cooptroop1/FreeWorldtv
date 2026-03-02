import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'FreeStreamWorld2026';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('key');

  if (secret !== REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized – wrong key' }, { status: 401 });
  }

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  }

  console.log('🚀 Starting FULL refresh — titles + providers...');

  let allTitles: any[] = [];
  let page = 1;
  let totalCalls = 0;

  try {
    // === 1. Fetch full catalog (fixed to handle both 'titles' and 'results') ===
    while (true) {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US,GB,CA,AU&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;
      const data = await res.json();

      const pageTitles = data.titles || data.results || [];
      if (pageTitles.length === 0) break;

      allTitles = [...allTitles, ...pageTitles];
      console.log(`Page ${page}: +${pageTitles.length} titles (Total now: ${allTitles.length})`);
      page++;
      await new Promise(r => setTimeout(r, 400));
    }

    // === 2. Fetch ALL provider logos (this is what gives you real FX logo etc.) ===
    console.log('Fetching providers with real logos...');
    const sourcesRes = await fetch(`https://api.watchmode.com/v1/providers/?apiKey=${WATCHMODE_API_KEY}`, { cache: 'no-store' });
    const providersData = await sourcesRes.json();
    const allProviders = providersData.results || providersData || [];
    console.log(`✅ Fetched ${allProviders.length} real provider logos`);

    // Save both for 24 hours (this is what your modal reads)
    await kv.set('full_free_catalog', allTitles, { ex: 86400 });
    await kv.set('watchmode_providers', allProviders, { ex: 86400 });
    await kv.set('lastFullRefresh', Date.now(), { ex: 86400 });

    console.log(`🎉 REFRESH COMPLETE — Titles: ${allTitles.length} | Providers: ${allProviders.length}`);

    return NextResponse.json({
      success: true,
      totalTitles: allTitles.length,
      totalProviders: allProviders.length,
      callsUsed: totalCalls,
      message: 'Full catalog + provider logos saved for 24 hours'
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
