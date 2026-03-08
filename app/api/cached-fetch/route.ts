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

  // === REAL NEW RELEASES (compare today vs yesterday) ===
  let newReleases: any[] = [];
  try {
    const today = await kv.get<any[]>('full_free_catalog');
    const yesterday = await kv.get<any[]>('full_free_catalog_yesterday');
    if (Array.isArray(today) && Array.isArray(yesterday)) {
      const yesterdayIds = new Set(yesterday.map(t => t.id));
      newReleases = today.filter(t => !yesterdayIds.has(t.id)).slice(0, 20);
    }
  } catch (e) {}

  // === SEARCH: snapshot first ===
  if (query) {
    try {
      const snapshot = await kv.get<any[]>('full_free_catalog');
      if (Array.isArray(snapshot) && snapshot.length > 0) {
        const lowerQuery = query.toLowerCase();
        let filtered = snapshot.filter(t => t.title && t.title.toLowerCase().includes(lowerQuery));
        if (types !== 'movie,tv_series') {
          filtered = filtered.filter(t => (t.type || t.tmdb_type) === types);
        }
        return NextResponse.json({ success: true, titles: filtered.slice(0, 48), newReleases, region, totalPages: 1, fromCache: true });
      }
    } catch (e) {}
  }

  // === NORMAL BROWSE (grid, infinite scroll, Top 10, Trending) ===
  try {
    const snapshot = await kv.get<any[]>('full_free_catalog');
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      let filtered = snapshot;
      if (types !== 'movie,tv_series') {
        filtered = filtered.filter(t => (t.type || t.tmdb_type) === types);
      }
      const start = (page - 1) * 48;
      const paged = filtered.slice(start, start + 48);
      return NextResponse.json({ success: true, titles: paged, newReleases, region, totalPages: Math.ceil(filtered.length / 48), fromCache: true });
    }
  } catch (e) {}

  // === FALLBACK: Live Watchmode API (this is what keeps the site alive) ===
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
    return NextResponse.json({ success: true, titles, newReleases, region, totalPages: Math.max(1, Math.ceil((raw.total_results || raw.total_pages || titles.length) / 48)), fromCache: false });
  } catch (error) {
    console.error('Watchmode fallback error:', error);
    return NextResponse.json({ success: true, titles: [], newReleases, region, totalPages: 1, fromCache: false });
  }
}
