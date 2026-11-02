import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { CACHE_TTL_SECONDS } from '@/lib/regions';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

type SimilarTitle = {
  id: number;
  title: string;
  year?: number;
  type?: string;
  tmdb_id?: number;
  poster?: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  const cacheKey = `similar:${id}`;
  const cached = await kv.get<SimilarTitle[]>(cacheKey);
  if (Array.isArray(cached) && cached.length) {
    return NextResponse.json({ success: true, titles: cached, fromCache: true });
  }

  return NextResponse.json({ success: true, titles: [], fromCache: true, paused: true });
}

