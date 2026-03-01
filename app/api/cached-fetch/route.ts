import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const region = searchParams.get('region') || 'US';
  const type = searchParams.get('type') || 'movie,tv_series';
  const page = searchParams.get('page') || '1';
  const query = searchParams.get('query') || '';
  const genres = searchParams.get('genres') || '';
  const tab = searchParams.get('tab') || 'discover';

  const cacheKey = `wm:${tab}:${region}:${type}:${page}:${query || 'noq'}:${genres || 'nog'}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Build the real API URL
  let url = `/api/popular-free?region=${region}&type=${type}&page=${page}`;
  if (query) url = `/api/search?query=${encodeURIComponent(query)}&region=${region}&page=${page}`;
  else if (genres) url += `&genres=${genres}`;

  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();

  if (json.success) {
    await redis.set(cacheKey, json, { ex: 3600 }); // cache 1 hour
  }

  return NextResponse.json(json);
}
