import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'FreeStreamWorld2026'; // ← now reads your Vercel env var

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized – wrong key' }, { status: 401 });
  }

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  }

  console.log('🚀 Starting FULL Watchmode free catalog + providers sync...');

  let allTitles: any[] = [];
  let page = 1;
  let totalCalls = 0;

  try {
    // === 1. Fetch full catalog (your original loop) ===
    while (true) {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US,GB,CA,AU&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;
      const data = await res.json();
      if (!data.titles || data.titles.length === 0) break;
      allTitles = [...allTitles, ...data.titles];
      console.log(`Page ${page}: +${data.titles.length} titles (Total now: ${allTitles.length})`);
      page++;
      await new Promise(r => setTimeout(r, 400));
    }

    // === 2. Fetch ALL provider logos (new + cached for 24h) ===
    const sourcesRes = await fetch(`https://api.watchmode.com/v1/providers/?apiKey=${WATCHMODE_API_KEY}`, { cache: 'no-store' });
    const allProviders = await sourcesRes.json();
    console.log(`✅ Fetched ${allProviders.length} providers with logos`);

    // Save everything (titles + providers) for full 24 hours
    await kv.set('full_free_catalog', allTitles, { ex: 86400 });
    await kv.set('watchmode_providers', allProviders, { ex: 86400 });        // ← consistent key used by ClientTabs
    await kv.set('full_free_catalog_timestamp', Date.now(), { ex: 86400 });
    await kv.set('lastFullRefresh', Date.now(), { ex: 86400 });

    console.log(`🎉 FULL SYNC COMPLETE! ${allTitles.length} titles + ${allProviders.length} providers saved for 24h.`);

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
