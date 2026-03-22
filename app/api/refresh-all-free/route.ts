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
  console.log(`🚀 STARTING ${isFullRefresh ? 'FULL (40 pages = 80 calls)' : 'SMART DAILY (4 calls)'}...`);

  let freeTitles: any[] = [];
  let premiumTitles: any[] = [];
  let totalCalls = 0;
  const maxPages = isFullRefresh ? 40 : 2;

  // === FREE TITLES ===
  let page = 1;
  while (page <= maxPages) {
    try {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ FREE page ${page} — HTTP ${res.status}: ${errorText}`);
        page++;
        continue;
      }

      const data = await res.json();
      const titles = data.titles || [];

      // DEBUG: show exactly what page 1 returns
      if (page === 1) {
        console.log(`DEBUG FREE page 1: ${titles.length} titles | total_pages=${data.total_pages || 'N/A'} | total_results=${data.total_results || 'N/A'}`);
      }

      if (titles.length === 0) break;

      freeTitles = [...freeTitles, ...titles];
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

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ PREMIUM page ${page} — HTTP ${res.status}: ${errorText}`);
        page++;
        continue;
      }

      const data = await res.json();
      const titles = data.titles || [];

      if (page === 1) {
        console.log(`DEBUG PREMIUM page 1: ${titles.length} titles | total_pages=${data.total_pages || 'N/A'} | total_results=${data.total_results || 'N/A'}`);
      }

      if (titles.length === 0) break;

      premiumTitles = [...premiumTitles, ...titles];
      page++;
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`Premium page ${page} failed`, e);
      page++;
    }
  }

  // === GUARD: do NOT save empty catalog (keeps your old 5000 titles safe) ===
  if (freeTitles.length === 0 && premiumTitles.length === 0) {
    console.log('⚠️ No titles fetched — keeping old catalog in cache');
  } else {
    // === SMART MERGE + SAVE ===
    if (!isFullRefresh) {
      const oldFreeRaw = await kv.get('full_free_catalog');
      const oldPremiumRaw = await kv.get('full_premium_catalog');
      const oldFree: any[] = Array.isArray(oldFreeRaw) ? oldFreeRaw : [];
      const oldPremium: any[] = Array.isArray(oldPremiumRaw) ? oldPremiumRaw : [];

      const newFreeIds = new Set(freeTitles.map((t: any) => t.id));
      const newPremiumIds = new Set(premiumTitles.map((t: any) => t.id));

      freeTitles = [...freeTitles, ...oldFree.filter((t: any) => !newFreeIds.has(t.id))];
      premiumTitles = [...premiumTitles, ...oldPremium.filter((t: any) => !newPremiumIds.has(t.id))];
    }

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
  }

  if (isFullRefresh) await kv.set('lastFullRefresh', Date.now());
  else await kv.set('lastDailyRefresh', Date.now());

  console.log(`🎉 DONE — ${isFullRefresh ? 'FULL (40 pages)' : 'DAILY'} | Free: ${freeTitles.length} | Premium: ${premiumTitles.length} | Calls: ${totalCalls}`);

  return NextResponse.json({
    success: true,
    mode: isFullRefresh ? 'full' : 'daily',
    freeTitles: freeTitles.length,
    premiumTitles: premiumTitles.length,
    callsUsed: totalCalls
  });
}
