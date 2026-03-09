import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mySuperSecretRefreshKey2026xyz123';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('key');

  if (secret !== REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  }

  console.log('🚀 Starting multi-region refresh (one region at a time)...');
  let allTitles: any[] = [];
  const seenIds = new Set();
  let totalCalls = 0;
  const regions = ['US', 'GB', 'CA', 'AU'];

  try {
    for (const region of regions) {
      let page = 1;
      console.log(`🌍 Fetching region: ${region}`);

      while (true) {
        const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=${region}&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
        
        const res = await fetch(url, { cache: 'no-store' });
        totalCalls++;

        if (!res.ok) {
          console.error(`❌ ${region} page ${page} failed`);
          break;
        }

        const data = await res.json();
        const pageTitles = data.titles || data.results || [];

        if (pageTitles.length === 0) break;

        const uniquePage = pageTitles.filter((t: any) => {
          if (seenIds.has(t.id)) return false;
          seenIds.add(t.id);
          return true;
        });

        allTitles = [...allTitles, ...uniquePage];
        console.log(`✅ ${region} page ${page}: +${uniquePage.length} titles (Total: ${allTitles.length})`);

        page++;
        await new Promise(r => setTimeout(r, 350));
      }
    }

    // Save providers
    const sourcesRes = await fetch(`https://api.watchmode.com/v1/providers/?apiKey=${WATCHMODE_API_KEY}`, { cache: 'no-store' });
    const providersData = await sourcesRes.json();
    const allProviders = providersData.results || providersData || [];

    console.log(`✅ Fetched ${allProviders.length} providers`);

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
    console.error('❌ Refresh failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
