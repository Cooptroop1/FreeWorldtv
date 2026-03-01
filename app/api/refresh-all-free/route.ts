import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || '';   // ← We will set this next

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('key');

  // Only allow if the secret matches
  if (secret !== REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized – wrong key' }, { status: 401 });
  }

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  }

  console.log('🚀 Starting FULL Watchmode free catalog sync...');

  let allTitles: any[] = [];
  let page = 1;
  let totalCalls = 0;

  try {
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

    await kv.set('full_free_catalog', allTitles, { ex: 86400 });
    await kv.set('full_free_catalog_timestamp', Date.now(), { ex: 86400 });

    console.log(`✅ FULL SYNC COMPLETE! ${allTitles.length} titles saved using ${totalCalls} calls.`);

    return NextResponse.json({
      success: true,
      totalTitles: allTitles.length,
      callsUsed: totalCalls,
      message: 'Full catalog saved for 24 hours'
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
