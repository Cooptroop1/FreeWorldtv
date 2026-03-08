import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'FreeStreamWorld2026';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const region = (searchParams.get('region') || 'US').toUpperCase();
  const types = searchParams.get('types') || 'movie,tv_series';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // === SEARCH: Use snapshot (exactly like Radio) ===
  if (query) {
    try {
      const snapshot = await kv.get<any[]>('full_free_catalog');
      if (Array.isArray(snapshot) && snapshot.length > 0) {
        const lowerQuery = query.toLowerCase();
        let filtered = snapshot.filter(t => 
          t.title && t.title.toLowerCase().includes(lowerQuery)
        );

        // Respect Movies / TV Shows switch
        if (types !== 'movie,tv_series') {
          filtered = filtered.filter(t => (t.type || t.tmdb_type) === types);
        }

        return NextResponse.json({
          success: true,
          titles: filtered.slice(0, 48),
          region,
          totalPages: 1,
          fromCache: true,
          message: `Snapshot search for "${query}"`
        });
      }
    } catch (e) {
      console.error('Snapshot search error:', e);
    }
  }

  // === NORMAL BROWSE (Trending / New Releases / Top 10 / Grid) — use snapshot ===
  try {
    const snapshot = await kv.get<any[]>('full_free_catalog');
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      const start = (page - 1) * 48;
      const paged = snapshot.slice(start, start + 48);
      return NextResponse.json({
        success: true,
        titles: paged,
        region,
        totalPages: Math.ceil(snapshot.length / 48),
        fromCache: true
      });
    }
  } catch (e) {
    console.error('Snapshot browse error:', e);
  }

  // Fallback (only if snapshot missing)
  return NextResponse.json({ success: false, error: 'No snapshot available' });
}
