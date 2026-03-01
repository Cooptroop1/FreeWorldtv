import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';

if (!WATCHMODE_API_KEY) {
  console.error('❌ WATCHMODE_API_KEY is missing from environment variables');
}

const BASE_URL = 'https://api.watchmode.com/v1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get('query')?.trim();
  const region = (searchParams.get('region') || 'US').toUpperCase();
  const types = searchParams.get('types') || 'movie,tv_series';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const genres = searchParams.get('genres') || '';

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ 
      success: false, 
      error: 'WATCHMODE_API_KEY is missing. Please add it in Vercel Settings → Environment Variables (or .env.local) and redeploy.' 
    }, { status: 500 });
  }

  // Unique cache key...
  const cacheKey = `freestream:${query ? 'search' : 'list'}:${region}:${types}:${page}:${genres || 'all'}:${query || ''}`;

  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, ...cached });
    }
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
      message: query 
        ? `Free results for "${query}"` 
        : `Popular free titles in ${region}`,
    };

    try {
      await kv.set(cacheKey, normalized, { ex: query ? 900 : 3600 });
    } catch (e) {
      console.error('KV write failed (non-fatal):', e);
    }

    return NextResponse.json({ success: true, ...normalized });
  } catch (error) {
    console.error('Watchmode fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load titles – check console or try again' 
    });
  }
}
