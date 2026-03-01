import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'US';
  const contentType = searchParams.get('type') || 'movie,tv_series';
  const page = parseInt(searchParams.get('page') || '1');
  const query = searchParams.get('query') || '';
  const genre = searchParams.get('genres') || '';

  // Unique cache key
  const cacheKey = `wm:${region}:${contentType}:${page}:${query || 'noq'}:${genre || 'nog'}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Build Watchmode URL
  let url = `https://api.watchmode.com/v1/title/popular?apiKey=${process.env.WATCHMODE_API_KEY}&types=${contentType}&page=${page}&regions=${region}`;
  if (query) {
    url = `https://api.watchmode.com/v1/search?apiKey=${process.env.WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(query)}&page=${page}`;
  } else if (genre) {
    url += `&genres=${genre}`;
  }

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (json.results || json.title_results) {
      await redis.set(cacheKey, json, { ex: 3600 }); // 1 hour
      return NextResponse.json(json);
    } else {
      return NextResponse.json({ error: 'No results' }, { status: 404 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'API error' }, { status: 500 });
  }
}
