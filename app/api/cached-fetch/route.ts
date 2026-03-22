import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// === AUTO REFRESH SETTINGS — 30-day full rebuild (clean files) ===
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;     // daily → 4 calls
const FULL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // every 30 days → full 20 pages
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback-secret-for-local-dev-only';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const paid = searchParams.get('paid') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const section = searchParams.get('section');
  const types = searchParams.get('types') || 'movie,tv_series';

  const callTime = new Date().toISOString();
  console.log(`[${callTime}] WATCHMODE API CALL - cached-fetch - query: ${query || 'none'} - section: ${section || 'none'} - paid: ${paid} - page: ${page} - types: ${types}`);

  // === AUTOMATIC REFRESH (30-day full + daily smart) ===
  try {
    const lastFull = await kv.get<number>('lastFullRefresh') || 0;
    const lastDaily = await kv.get<number>('lastDailyRefresh') || 0;
    const now = Date.now();

    const lock = await kv.get('refresh_lock');
    if (lock) {
      console.log(`[${callTime}] Refresh already in progress (locked)`);
    } else {
      let mode = '';
      if (now - lastFull > FULL_INTERVAL_MS && !query && !paid) {
        mode = 'full';          // ← full rebuild every 30 days
      } else if (now - lastDaily > DAILY_INTERVAL_MS && !query && !paid) {
        mode = 'daily';
      }

      if (mode) {
        await kv.set('refresh_lock', '1', { ex: 300 });

        const host = request.headers.get('host') || 'freestreamworld.com';
        const url = `https://${host}/api/refresh-all-free?secret=${REFRESH_SECRET}&mode=${mode}`;
        
        fetch(url, { cache: 'no-store' })
          .then(() => kv.del('refresh_lock'))
          .catch(() => kv.del('refresh_lock'));

        console.log(`[${callTime}] 🔥 AUTO ${mode.toUpperCase()} REFRESH triggered (locked for 5 min)`);
      }
    }
  } catch (e) {
    console.error('Auto-refresh check failed:', e);
  }

  // FREE SECTION (unchanged)
  if (!paid) {
    const raw = await kv.get('full_free_catalog');
    let catalog: any[] = Array.isArray(raw) ? raw : [];
    if (types !== 'movie,tv_series') {
      catalog = catalog.filter((t: any) => t.type === types);
    }
    const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
    const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
    if (fromYear > 0 || toYear < 3000) {
      catalog = catalog.filter((t: any) => {
        const y = t.year || 0;
        return y >= fromYear && y <= toYear;
      });
    }
    const minRating = parseInt(searchParams.get('minRating') || '0', 10);
    if (minRating > 0) {
      catalog = catalog.filter((t: any) => {
        const rating = t.imdb_rating || t.tmdb_rating || t.vote_average || 0;
        return rating >= minRating;
      });
    }
    if (section === 'trending') {
      const sorted = [...catalog].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      return NextResponse.json({ success: true, titles: sorted.slice(0, 20) });
    }
    if (section === 'new-releases') {
      const previousRaw = await kv.get('previous_free_catalog');
      const previous: any[] = Array.isArray(previousRaw) ? previousRaw : [];
      const prevIds = new Set(previous.map((t: any) => t.id));
      let newTitles = catalog.filter((t: any) => !prevIds.has(t.id));
      newTitles.sort((a, b) => (b.year || 0) - (a.year || 0));
      return NextResponse.json({ success: true, titles: newTitles.slice(0, 20) });
    }
    if (query) {
      const filtered = catalog.filter((t: any) =>
        t.title?.toLowerCase().includes(query.toLowerCase())
      );
      return NextResponse.json({
        success: true,
        titles: filtered.slice((page - 1) * 48, page * 48)
      });
    }
    const start = (page - 1) * 48;
    return NextResponse.json({
      success: true,
      titles: catalog.slice(start, start + 48)
    });
  }

  // PREMIUM SECTION (unchanged)
  const rawPremium = await kv.get('full_premium_catalog');
  let catalogPremium: any[] = Array.isArray(rawPremium) ? rawPremium : [];
  if (types !== 'movie,tv_series') {
    catalogPremium = catalogPremium.filter((t: any) => t.type === types);
  }
  const start = (page - 1) * 48;
  return NextResponse.json({
    success: true,
    titles: catalogPremium.slice(start, start + 48)
  });
}
