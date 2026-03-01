import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY!;
const BASE_URL = 'https://api.watchmode.com/v1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const q = searchParams.get('q') || '';
  const page = searchParams.get('page') || '1'; // prep for infinite scroll (step 3)

  if (!type || !WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'Missing type or API key' }, { status: 400 });
  }

  // Build unique cache key + Watchmode URL (exact official v1 endpoints)
  let cacheKey = `watchmode:${type}`;
  let apiUrl = '';

  if (type === 'popular-free') {
    cacheKey += `:p${page}`;
    apiUrl = `${BASE_URL}/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=GB&sort_by=popularity_desc&page=${page}&limit=50`;
  } else if (type === 'search') {
    cacheKey += `:${q.toLowerCase().trim()}`;
    apiUrl = `${BASE_URL}/search/?apiKey=${WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(q)}`;
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // 1. Safe KV cache read (never throws)
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch (err) {
    console.error('KV GET failed (continuing to fresh fetch):', err);
  }

  // 2. Fresh Watchmode fetch
  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });

    if (!res.ok) throw new Error(`Watchmode ${res.status}`);

    const data = await res.json();

    // 3. Safe KV cache write (non-blocking)
    try {
      const ttl = type === 'popular-free' ? 3600 : 600; // 1 hour vs 10 min
      await kv.set(cacheKey, data, { ex: ttl });
    } catch (err) {
      console.error('KV SET failed (non-fatal):', err);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`Watchmode fetch failed for ${type}:`, error);
    // Always return valid JSON (no 500 ever)
    return NextResponse.json({ error: `Failed to load ${type} – check console` }, { status: 200 });
  }
}
