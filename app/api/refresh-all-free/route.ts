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

  console.log('🚀 Starting FULL 24h refresh — titles + providers...');
  let allTitles: any[] = [];
  let page = 1;
  let totalCalls = 0;
  const seenIds = new Set(); // ← deduplication

  try {
    // Fetch full free catalog (US/GB/CA/AU — your main regions)
    while (true) {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US,GB,CA,AU&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;

      if (!res.ok) {
        console.warn(`⚠️ Page ${page} failed (${res.status}) — skipping`);
        break;
      }

      const data = await res.json();
      const pageTitles = data.titles || data.results || [];

      if (pageTitles.length === 0) break;

      // Deduplicate by ID
      const uniquePage = pageTitles.filter((t: any) => {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
        return true;
      });

      allTitles = [...allTitles, ...uniquePage];
      console.log(`Page ${page}: +${uniquePage.length} new titles (Total: ${allTitles.length})`);

      page++;
      await new Promise(r => setTimeout(r, 350)); // safe delay
    }

    // Fetch real provider logos (used in your sources modal)
    console.log('Fetching providers with real logos...');
    const sourcesRes = await fetch(`https://api.watchmode.com/v1/providers/?apiKey=${WATCHMODE_API_KEY}`, { cache: 'no-store' });
    const providersData = await sourcesRes.json();
    const allProviders = providersData.results || providersData || [];

    console.log(`✅ Fetched ${allProviders.length} real provider logos`);

    // Save everything
    await kv.set('full_free_catalog', allTitles, { ex: 86400 });
    await kv.set('watchmode_providers', allProviders, { ex: 86400 });
    await kv.set('lastFullRefresh', Date.now(), { ex: 86400 });

    console.log(`🎉 REFRESH COMPLETE — Titles: ${allTitles.length} | Providers: ${allProviders.length} | Calls: ${totalCalls}`);

    return NextResponse.json({
      success: true,
      totalTitles: allTitles.length,
      totalProviders: allProviders.length,
      callsUsed: totalCalls,
      message: 'Full 24h catalog + provider logos saved'
    });
  } catch (error) {
    console.error('❌ Refresh failed:', error);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
