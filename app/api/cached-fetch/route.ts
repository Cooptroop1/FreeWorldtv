import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const BASE_URL = 'https://api.watchmode.com/v1';
const REFRESH_SECRET = 'FreeStreamWorld2026';   // ← change this if you want a different secret

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const region = (searchParams.get('region') || 'US').toUpperCase();
  const types = searchParams.get('types') || 'movie,tv_series';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const genres = searchParams.get('genres') || '';

  // === NEW: 24h auto-snapshot trigger (exactly what you asked for) ===
  // First visitor after 24h automatically refreshes the full catalog
  try {
    const lastFullRefresh = await kv.get<number>('lastFullRefresh') || 0;
    const now = Date.now();

    if (now - lastFullRefresh > 24 * 60 * 60 * 1000 && !query && !genres) {
      console.log('🕒 24h expired → first visitor triggering full snapshot...');
      // Fire and forget (background) so the user doesn't wait
      fetch(`https://${request.headers.get('host')}/api/refresh-all-free?secret=${REFRESH_SECRET}`, {
        cache: 'no-store'
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Auto-refresh check failed (continuing):', e);
  }
  // === END OF NEW LOGIC ===

  // FIRST: Check full catalog cache (your daily preload)
  try {
    const fullCatalog = await kv.get('full_free_catalog');
    if (Array.isArray(fullCatalog) && fullCatalog.length > 0 && !query && !genres) {
      // For popular lists (no search, no genre) → use full cache
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
  } catch (e) {
    console.error('Full catalog read failed (continuing):', e);
  }

  // Fallback to per-page caching (your original logic)
  const cacheKey = `freestream:${query ? 'search' : 'list'}:${region}:${types}:${page}:${genres || 'all'}:${query || ''}`;
  const cacheTTL = query ? 1800 : 86400;

  try {
    const cached = await kv.get(cacheKey);
    if (cached) return NextResponse.json({ success: true, ...cached, fromCache: true });
  } catch (e) {
    console.error('KV read failed (continuing):', e);
  }

  let apiUrl = '';
  if (query) {
    apiUrl = `${BASE_URL}/search/?apiKey=${WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(query)}&page=${page}&limit=48`;
  } else {
    apiUrl = `${BASE_URL}/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=${region}&types=${types}&sort_by=popularity_desc&page=${page}&limit=48`;
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
      message: query ? `Free results for "${query}"` : `Popular free titles in ${region}`,
      fromCache: false,
    };
    await kv.set(cacheKey, normalized, { ex: cacheTTL });
    return NextResponse.json({ success: true, ...normalized });
  } catch (error) {
    console.error('Watchmode fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load titles' });
  }
}
