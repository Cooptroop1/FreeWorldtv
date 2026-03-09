import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// === CHANGE THIS NUMBER ANYTIME YOU WANT ===
const REFRESH_INTERVAL_HOURS = 72;   // 24 = 1 day, 72 = 3 days, 168 = 1 week

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const paid = searchParams.get('paid') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // === AUTO-REFRESH: First visitor after your chosen time triggers it ===
  const intervalMs = REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
  try {
    const lastRefresh = await kv.get<number>('lastFullRefresh') || 0;
    if (Date.now() - lastRefresh > intervalMs && !query && !paid) {
      const host = request.headers.get('host');
      fetch(`https://${host}/api/refresh-all-free?secret=mySuperSecretRefreshKey2026xyz123`, {
        cache: 'no-store'
      }).catch(() => {});
    }
  } catch (e) {}

        // FREE (Discover + Search) + Real Trending + Real New Releases
  if (!paid) {
    const raw = await kv.get('full_free_catalog');
    let catalog: any[] = Array.isArray(raw) ? raw : [];

    // Movies Only / TV Shows Only filter (only affects grid/search/paging)
    const types = searchParams.get('types') || 'movie,tv_series';
    if (types !== 'movie,tv_series') {
      catalog = catalog.filter((t: any) => t.type === types);
    }

    const section = searchParams.get('section');

    // === REAL TRENDING NOW (sorted by popularity) ===
    if (section === 'trending') {
      const sorted = [...catalog].sort((a, b) => {
        const scoreA = (a.vote_average || 0) * 10 + (a.vote_count || 0) / 100;
        const scoreB = (b.vote_average || 0) * 10 + (b.vote_count || 0) / 100;
        return scoreB - scoreA;
      });
      return NextResponse.json({
        success: true,
        titles: sorted.slice(0, 20)
      });
    }

    // === REAL NEW RELEASES THIS WEEK (titles added since last snapshot) ===
    if (section === 'new-releases') {
      const previousRaw = await kv.get('previous_free_catalog');
      const previous: any[] = Array.isArray(previousRaw) ? previousRaw : [];
      const prevIds = new Set(previous.map((t: any) => t.id));

      let newTitles = catalog.filter((t: any) => !prevIds.has(t.id));

      // Sort newest first by year
      newTitles.sort((a, b) => (b.year || 0) - (a.year || 0));

      return NextResponse.json({
        success: true,
        titles: newTitles.slice(0, 20)
      });
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

  // PREMIUM
  const rawPremium = await kv.get('full_premium_catalog');
  const catalogPremium: any[] = Array.isArray(rawPremium) ? rawPremium : [];
  const start = (page - 1) * 48;
  return NextResponse.json({
    success: true,
    titles: catalogPremium.slice(start, start + 48)
  });
}
