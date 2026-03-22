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
  console.log(`🚀 STARTING ${isFullRefresh ? 'FULL MONTHLY REBUILD (120 calls)' : 'SMART DAILY (4 calls)'}...`);

  let freeTitles: any[] = [];
  let premiumTitles: any[] = [];
  let totalCalls = 0;
  let maxPages = isFullRefresh ? 60 : 2;   // ← safe & reliable
  let consecutiveFailures = 0;

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // === FREE TITLES ===
  let page = 1;
  while (page <= maxPages && consecutiveFailures < 3) {
    try {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;

      if (!res.ok) {
        if (res.status === 429) {
          console.log(`⏳ RATE LIMIT on free page ${page} — waiting 5s...`);
          await sleep(5000);
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const titles = data.titles || [];

      if (page === 1 && data.total_pages) {
        maxPages = Math.min(maxPages, data.total_pages);
        console.log(`📊 FREE: API says ${data.total_pages} pages — using ${maxPages}`);
      }

      console.log(`✅ FREE page ${page}: ${titles.length} titles`);

      if (titles.length === 0) break;

      freeTitles = [...freeTitles, ...titles];
      page++;
      await sleep(800);
      consecutiveFailures = 0;
    } catch (e: any) {
      console.error(`❌ FREE page ${page}:`, e.message);
      consecutiveFailures++;
      page++;
      await sleep(2000);
    }
  }

  // === PREMIUM TITLES ===
  page = 1;
  maxPages = isFullRefresh ? 60 : 2;
  consecutiveFailures = 0;
  while (page <= maxPages && consecutiveFailures < 3) {
    try {
      const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=sub&regions=US&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
      const res = await fetch(url, { cache: 'no-store' });
      totalCalls++;

      if (!res.ok) {
        if (res.status === 429) {
          console.log(`⏳ RATE LIMIT on premium page ${page} — waiting 5s...`);
          await sleep(5000);
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const titles = data.titles || [];

      if (page === 1 && data.total_pages) {
        maxPages = Math.min(maxPages, data.total_pages);
        console.log(`📊 PREMIUM: API says ${data.total_pages} pages — using ${maxPages}`);
      }

      console.log(`✅ PREMIUM page ${page}: ${titles.length} titles`);

      if (titles.length === 0) break;

      premiumTitles = [...premiumTitles, ...titles];
      page++;
      await sleep(800);
      consecutiveFailures = 0;
    } catch (e: any) {
      console.error(`❌ PREMIUM page ${page}:`, e.message);
      consecutiveFailures++;
      page++;
      await sleep(2000);
    }
  }

  // === SMART MERGE + 30-DAY SAVE ===
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

  if (isFullRefresh) await kv.set('lastFullRefresh', Date.now());
  else await kv.set('lastDailyRefresh', Date.now());

  console.log(`🎉 DONE — ${isFullRefresh ? 'FULL MONTHLY' : 'DAILY SMART'} | Free: ${processedFree.length} | Premium: ${processedPremium.length} | Calls: ${totalCalls}`);

  return NextResponse.json({
    success: true,
    mode: isFullRefresh ? 'full' : 'daily',
    freeTitles: processedFree.length,
    premiumTitles: processedPremium.length,
    callsUsed: totalCalls,
    message: isFullRefresh ? `Full monthly rebuilt (${totalCalls} calls — cached 30 days)` : 'Smart daily complete (4 calls)'
  });
}
