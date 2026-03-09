import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mySuperSecretRefreshKey2026xyz123';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('key');
  if (secret !== REFRESH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!WATCHMODE_API_KEY) return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });

  console.log('🚀 REFRESHING BOTH FREE + PREMIUM SNAPSHOTS...');

  let freeTitles: any[] = [];
  let premiumTitles: any[] = [];
  const seenFree = new Set();
  const seenPremium = new Set();
  let totalCalls = 0;

  // === FREE TITLES (US only, safe) ===
  let page = 1;
  while (page <= 12) {
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
    const res = await fetch(url, { cache: 'no-store' });
    totalCalls++;
    const data = await res.json();
    const titles = data.titles || [];
    if (titles.length === 0) break;
    const unique = titles.filter((t: any) => !seenFree.has(t.id) && seenFree.add(t.id));
    freeTitles = [...freeTitles, ...unique];
    page++;
    await new Promise(r => setTimeout(r, 400));
  }

  // === PREMIUM TITLES (now also 12 pages so ~3k like free) ===
  page = 1;
  while (page <= 12) {
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=sub&regions=US&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
    const res = await fetch(url, { cache: 'no-store' });
    totalCalls++;
    const data = await res.json();
    const titles = data.titles || [];
    if (titles.length === 0) break;
    const unique = titles.filter((t: any) => !seenPremium.has(t.id) && seenPremium.add(t.id));
    premiumTitles = [...premiumTitles, ...unique];
    page++;
    await new Promise(r => setTimeout(r, 400));
  }

  // === PROCESS TITLES (keep EVERY original field + ensure genres & poster) ===
  const processTitle = (t: any) => ({
    ...t,                                   // ← THIS RESTORES ALL POSTERS & EVERYTHING
    poster: t.poster || t.image_url || null,
    genre_names: t.genre_names || [],
    genres: t.genres || [],
    title: t.title || t.name || "Unknown Title",
  });

  const processedFree = freeTitles.map(processTitle);
  const processedPremium = premiumTitles.map(processTitle);

  // === SAVE PREVIOUS SNAPSHOT (for New Releases) ===
  const oldFreeCatalog = await kv.get('full_free_catalog');
  if (oldFreeCatalog && Array.isArray(oldFreeCatalog) && oldFreeCatalog.length > 0) {
    await kv.set('previous_free_catalog', oldFreeCatalog, { ex: 86400 * 7 });
  }

  // Save new snapshots
  await kv.set('full_free_catalog', processedFree, { ex: 86400 });
  await kv.set('full_premium_catalog', processedPremium, { ex: 86400 });
  await kv.set('lastFullRefresh', Date.now(), { ex: 86400 });

  console.log(`🎉 DONE — Free: ${processedFree.length} | Premium: ${processedPremium.length} | Calls: ${totalCalls}`);

  return NextResponse.json({
    success: true,
    freeTitles: processedFree.length,
    premiumTitles: processedPremium.length,
    callsUsed: totalCalls,
    message: 'Both ~3000 titles with genres + posters fully restored!'
  });
}
