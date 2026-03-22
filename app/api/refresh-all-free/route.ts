import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('key');
  const mode = searchParams.get('mode') || 'daily';
  if (secret !== REFRESH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!WATCHMODE_API_KEY) return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  if (!REFRESH_SECRET) return NextResponse.json({ error: 'REFRESH_SECRET missing' }, { status: 500 });

  const isFullRefresh = mode === 'full';
  console.log(`🚀 STARTING ${isFullRefresh ? 'FULL (10 pages = 20 calls)' : 'SMART DAILY (4 calls)'}...`);

  let freeTitles: any[] = [];
  let premiumTitles: any[] = [];
  const seenFree = new Set();
  const seenPremium = new Set();
  let totalCalls = 0;
  const maxPages = isFullRefresh ? 10 : 2;

  // === FREE TITLES ===
  let page = 1;
  while (page <= maxPages) {
    try {
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
    } catch (e) {
      console.error(`Free page ${page} failed`, e);
      page++;
    }
  }

  // === PREMIUM TITLES ===
  page = 1;
  while (page <= maxPages) {
    try {
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
    } catch (e) {
      console.error(`Premium page ${page} failed`, e);
      page++;
    }
  }

  // === SMART MERGE FOR DAILY ===
  if (!isFullRefresh) {
    const oldFreeRaw = await kv.get('full_free_catalog');
    const oldPremiumRaw = await kv.get('full_premium_catalog');
    const oldFree: any[] = Array.isArray(oldFreeRaw) ? oldFreeRaw : [];
    const oldPremium: any[] = Array.isArray(oldPremiumRaw) ? oldPremiumRaw : [];

    const newFreeIds = new Set(freeTitles.map((t: any) => t.id));
    const newPremiumIds = new Set(premiumTitles.map((t: any) => t.id));

    const oldFreeFiltered = oldFree.filter((t: any) => !newFreeIds.has(t.id));
    const oldPremiumFiltered = oldPremium.filter((t: any) => !newPremiumIds.has(t.id));

    freeTitles = [...freeTitles, ...oldFreeFiltered];
    premiumTitles = [...premiumTitles, ...oldPremiumFiltered];
  }

  // === PROCESS & SAVE (30 days) ===
  const processTitle = (t: any) => ({
    ...t,
    poster: t.poster || t.image_url || null,
    title: t.title || t.name || "Unknown Title",
    genre_names: Array.isArray(t.genre_names) ? t.genre_names : [],
  });

  const processedFree = freeTitles.map(processTitle);
  const processedPremium = premiumTitles.map(processTitle);

  const oldFreeCatalog = await kv.get('full_free_catalog');
  if (oldFreeCatalog && Array.isArray(oldFreeCatalog) && oldFreeCatalog.length > 0) {
    await kv.set('previous_free_catalog', oldFreeCatalog, { ex: 86400 * 30 });
  }

  await kv.set('full_free_catalog', processedFree, { ex: 86400 * 30 });
  await kv.set('full_premium_catalog', processedPremium, { ex: 86400 * 30 });

  if (isFullRefresh) {
    await kv.set('lastFullRefresh', Date.now());
  } else {
    await kv.set('lastDailyRefresh', Date.now());
  }

  console.log(`🎉 DONE — ${isFullRefresh ? 'FULL (10 pages)' : 'DAILY'} | Free: ${processedFree.length} | Premium: ${processedPremium.length} | Calls: ${totalCalls}`);

  return NextResponse.json({
    success: true,
    mode: isFullRefresh ? 'full' : 'daily',
    freeTitles: processedFree.length,
    premiumTitles: processedPremium.length,
    callsUsed: totalCalls
  });
}
