import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'FreeStreamWorld2026';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const region = (searchParams.get('region') || 'US').toUpperCase();
  const types = searchParams.get('types') || 'movie,tv_series';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const genres = searchParams.get('genres') || '';
  const paid = searchParams.get('paid') === 'true';

  // === AUTO-REFRESH ===
  try {
    const lastFullRefresh = await kv.get<number>('lastFullRefresh') || 0;
    const now = Date.now();
    if (now - lastFullRefresh > 24 * 60 * 60 * 1000 && !query && !genres) {
      const host = request.headers.get('host');
      fetch(`https://${host}/api/refresh-all-free?secret=${REFRESH_SECRET}`, { cache: 'no-store' }).catch(() => {});
    }
  } catch (e) {}

  // === REAL NEW RELEASES: compare today vs yesterday ===
  let newReleases: any[] = [];
  try {
    const todaySnapshot = await kv.get<any[]>('full_free_catalog');
    const yesterdaySnapshot = await kv.get<any[]>('full_free_catalog_yesterday');

    if (Array.isArray(todaySnapshot) && Array.isArray(yesterdaySnapshot)) {
      const yesterdayIds = new Set(yesterdaySnapshot.map(t => t.id));
      newReleases = todaySnapshot
        .filter(t => !yesterdayIds.has(t.id))
        .slice(0, 20);
    }
  } catch (e) {
    console.error('New releases comparison failed:', e);
  }

  // === SEARCH: use snapshot first ===
  if (query) {
    try {
      const fullCatalog = await kv.get<any[]>('full_free_catalog');
      if (Array.isArray(fullCatalog) && fullCatalog.length > 0) {
        const filtered = fullCatalog
          .filter(t => t.title?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 48);
        return NextResponse.json({
          success: true,
          titles: filtered,
          newReleases,
          region,
          totalPages: 1,
          fromCache: true,
          message: `Snapshot search for "${query}"`
        });
      }
    } catch (e) {}
  }

  // === FAST PATH: full catalog for normal browsing ===
  try {
    const fullCatalog = await kv.get('full_free_catalog');
    if (Array.isArray(fullCatalog) && fullCatalog.length > 0 && !query && !genres && !paid) {
      const start = (page - 1) * 48;
      const pagedTitles = fullCatalog.slice(start, start + 48);
      return NextResponse.json({
        success: true,
        titles: pagedTitles,
        newReleases,
        region,
        totalPages: Math.ceil(fullCatalog.length / 48),
        fromCache: true
      });
    }
  } catch (e) {}

  // === Regular cache & fallback ===
  const cacheKey = `freestream:${query ? 'search' : 'list'}:${region}:${types}:${page}:${genres || 'all'}:${query || ''}:${paid ? 'paid' : 'free'}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return NextResponse.json({ success: true, ...cached, fromCache: true });
  } catch (e) {}

  // === Live API fallback (only for sources/links) ===
  let apiUrl = '';
  if (query) {
    apiUrl = `https://api.watchmode.com/v1/search/?apiKey=${WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(query)}&page=${page}&limit=48`;
  } else {
    const sourceType = paid ? 'sub' : 'free';
    apiUrl = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=${sourceType}&regions=${region}&types=${types}&sort_by=popularity_desc&page=${page}&limit=48`;
    if (genres) apiUrl += `&genres=${genres}`;
  }

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Watchmode ${res.status}`);
    const raw = await res.json();
    const titles = raw.titles || raw.results || [];
    const normalized = {
      titles,
      newReleases,
      region,
      totalPages: Math.max(1, Math.ceil((raw.total_results || raw.total_pages || titles.length) / 48)),
      message: query ? `Results for "${query}"` : `Popular titles in ${region}`,
      fromCache: false,
    };
    await kv.set(cacheKey, normalized, { ex: query ? 1800 : 86400 });
    return NextResponse.json({ success: true, ...normalized });
  } catch (error) {
    console.error('Watchmode fallback error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load titles' });
  }
}
