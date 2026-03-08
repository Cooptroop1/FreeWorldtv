import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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

  // === SEARCH: snapshot filter (fast, no API) ===
  if (query) {
    try {
      const snapshot = await kv.get<any[]>('full_free_catalog');
      if (Array.isArray(snapshot) && snapshot.length > 0) {
        const lowerQuery = query.toLowerCase();
        let filtered = snapshot.filter(t => 
          t.title && t.title.toLowerCase().includes(lowerQuery)
        );
        if (types !== 'movie,tv_series') {
          filtered = filtered.filter(t => (t.type || t.tmdb_type) === types);
        }
        return NextResponse.json({
          success: true,
          titles: filtered.slice(0, 48),
          newReleases,
          region,
          totalPages: 1,
          fromCache: true
        });
      }
    } catch (e) {}
  }

  // === NORMAL BROWSE (grid, infinite scroll, Trending, New Releases, Top 10) ===
  try {
    const snapshot = await kv.get<any[]>('full_free_catalog');
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      let filtered = snapshot;
      if (types !== 'movie,tv_series') {
        filtered = filtered.filter(t => (t.type || t.tmdb_type) === types);
      }
      const start = (page - 1) * 48;
      const paged = filtered.slice(start, start + 48);
      return NextResponse.json({
        success: true,
        titles: paged,
        newReleases,
        region,
        totalPages: Math.ceil(filtered.length / 48),
        fromCache: true
      });
    }
  } catch (e) {
    console.error('Snapshot error:', e);
  }

  // === Fallback (only if snapshot missing) ===
  return NextResponse.json({ success: false, error: 'No snapshot available' });
}
