import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// === AUTO REFRESH SETTINGS (smart + full) ===
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;   // 24 hours → smart daily (only 2 pages)
const FULL_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days → full rebuild
const REFRESH_SECRET = 'mySuperSecretRefreshKey2026xyz123';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const paid = searchParams.get('paid') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // === FULLY AUTOMATIC REFRESH (no cron job needed) ===
  try {
    const lastRefresh = await kv.get<number>('lastFullRefresh') || 0;
    const now = Date.now();
    let mode = '';

    if (now - lastRefresh > FULL_INTERVAL_MS && !query && !paid) {
      mode = 'full';
    } else if (now - lastRefresh > DAILY_INTERVAL_MS && !query && !paid) {
      mode = 'daily';
    }

    if (mode) {
      const host = request.headers.get('host') || 'freestreamworld.com';
      const url = `https://${host}/api/refresh-all-free?secret=${REFRESH_SECRET}&mode=${mode}`;
      fetch(url, { cache: 'no-store' }).catch(() => {});
      console.log(`🔄 AUTO ${mode.toUpperCase()} REFRESH triggered by first visitor`);
    }
  } catch (e) {
    console.error('Auto-refresh check failed:', e);
  }

  // FREE SECTION (unchanged)
  if (!paid) {
    const raw = await kv.get('full_free_catalog');
    let catalog: any[] = Array.isArray(raw) ? raw : [];

    // TYPES FILTER (Movies / TV / All)
    const types = searchParams.get('types') || 'movie,tv_series';
    if (types !== 'movie,tv_series') {
      catalog = catalog.filter((t: any) => t.type === types);
    }

    // YEAR RANGE FILTER
    const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
    const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
    if (fromYear > 0 || toYear < 3000) {
      catalog = catalog.filter((t: any) => {
        const y = t.year || 0;
        return y >= fromYear && y <= toYear;
      });
    }

    // MINIMUM RATING FILTER
    const minRating = parseInt(searchParams.get('minRating') || '0', 10);
    if (minRating > 0) {
      catalog = catalog.filter((t: any) => {
        const rating = t.imdb_rating || t.tmdb_rating || t.vote_average || 0;
        return rating >= minRating;
      });
    }

    const section = searchParams.get('section');

    // TRENDING
    if (section === 'trending') {
      const sorted = [...catalog].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      return NextResponse.json({ success: true, titles: sorted.slice(0, 20) });
    }

    // NEW RELEASES
    if (section === 'new-releases') {
      const previousRaw = await kv.get('previous_free_catalog');
      const previous: any[] = Array.isArray(previousRaw) ? previousRaw : [];
      const prevIds = new Set(previous.map((t: any) => t.id));
      let newTitles = catalog.filter((t: any) => !prevIds.has(t.id));
      newTitles.sort((a, b) => (b.year || 0) - (a.year || 0));
      return NextResponse.json({ success: true, titles: newTitles.slice(0, 20) });
    }

    // SEARCH
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

  const types = searchParams.get('types') || 'movie,tv_series';
  if (types !== 'movie,tv_series') {
    catalogPremium = catalogPremium.filter((t: any) => t.type === types);
  }

  const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
  const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
  if (fromYear > 0 || toYear < 3000) {
    catalogPremium = catalogPremium.filter((t: any) => {
      const y = t.year || 0;
      return y >= fromYear && y <= toYear;
    });
  }

  const minRating = parseInt(searchParams.get('minRating') || '0', 10);
  if (minRating > 0) {
    catalogPremium = catalogPremium.filter((t: any) => {
      const rating = t.imdb_rating || t.tmdb_rating || t.vote_average || 0;
      return rating >= minRating;
    });
  }

  const start = (page - 1) * 48;
  return NextResponse.json({
    success: true,
    titles: catalogPremium.slice(start, start + 48)
  });
}
