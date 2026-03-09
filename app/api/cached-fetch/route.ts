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

  // === AUTO-REFRESH trigger (unchanged) ===
  try {
    const lastFullRefresh = await kv.get<number>('lastFullRefresh') || 0;
    const now = Date.now();
    if (now - lastFullRefresh > 24 * 60 * 60 * 1000 && !query && !genres) {
      const host = request.headers.get('host');
      fetch(`https://${host}/api/refresh-all-free?secret=${REFRESH_SECRET}`, { cache: 'no-store' }).catch(() => {});
    }
  } catch (e) {}

  // === LOAD THE BIG SNAPSHOT (this is what you wanted) ===
  let fullCatalog: any[] = [];
  try {
    fullCatalog = (await kv.get('full_free_catalog')) || [];
  } catch (e) {
    console.error('Full catalog read failed:', e);
  }

  // === SEARCH MODE: Use the snapshot + simple title filter ===
  if (query && fullCatalog.length > 0) {
    const searchTerm = query.toLowerCase();
    const filtered = fullCatalog
      .filter((t: any) => t.title && t.title.toLowerCase().includes(searchTerm))
      .slice((page - 1) * 48, page * 48);   // respect page & limit

    return NextResponse.json({
      success: true,
      titles: filtered,
      region,
      totalPages: Math.ceil(fullCatalog.length / 48),
      fromCache: true,
      message: `Search results for "${query}" from 24h snapshot`
    });
  }

  // === NORMAL MODE (no search): use snapshot paging (Discover tab) ===
  if (fullCatalog.length > 0 && !query && !genres && !paid) {
    const start = (page - 1) * 48;
    const pagedTitles = fullCatalog.slice(start, start + 48);
    return NextResponse.json({
      success: true,
      titles: pagedTitles,
      region,
      totalPages: Math.ceil(fullCatalog.length / 48),
      fromCache: true,
      message: 'Loaded from full catalog cache'
    });
  }

  // === Fallback: real Watchmode call (only if snapshot is empty or paid/genres used) ===
  const cacheKey = `freestream:${query ? 'search' : 'list'}:${region}:${types}:${page}:${genres || 'all'}:${query || ''}:${paid ? 'paid' : 'free'}`;
  const cacheTTL = 86400;

  try {
    const cached = await kv.get(cacheKey);
    if (cached) return NextResponse.json({ success: true, ...cached, fromCache: true });
  } catch (e) {}

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
      region,
      totalPages: Math.max(1, Math.ceil((raw.total_results || raw.total_pages || titles.length) / 48)),
      message: query ? `Live results for "${query}"` : `Popular free titles in ${region}`,
      fromCache: false,
    };

    await kv.set(cacheKey, normalized, { ex: cacheTTL });
    return NextResponse.json({ success: true, ...normalized });
  } catch (error) {
    console.error('Watchmode fallback failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load titles' });
  }
}
