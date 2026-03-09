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

    // FREE (Discover + Search)
  if (!paid) {
    const raw = await kv.get('full_free_catalog');
    let catalog: any[] = Array.isArray(raw) ? raw : [];

    // NEW: Support for Movies Only / TV Shows Only filter (this fixes the "only 1 movie" problem)
    const types = searchParams.get('types') || 'movie,tv_series';
    if (types !== 'movie,tv_series') {
      catalog = catalog.filter((t: any) => t.type === types);
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
