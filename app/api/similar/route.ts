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

  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) {
    return NextResponse.json({ success: true, titles: [], fromCache: false });
  }

  try {
    const res = await fetch(
      `https://api.watchmode.com/v1/title/${id}/similar/?apiKey=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return NextResponse.json({ success: true, titles: [], fromCache: false });
    }
    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.similar || data.titles || [];
    const titles: SimilarTitle[] = raw.slice(0, 16).map((t: Record<string, unknown>) => ({
      id: Number(t.id),
      title: String(t.title || t.name || 'Untitled'),
      year: t.year ? Number(t.year) : undefined,
      type: t.type ? String(t.type) : undefined,
      tmdb_id: t.tmdb_id ? Number(t.tmdb_id) : undefined,
      poster: (t.poster as string | null) || null,
    })).filter((t: SimilarTitle) => t.id);

    if (titles.length) {
      await kv.set(cacheKey, titles, { ex: CACHE_TTL_SECONDS });
    }
    return NextResponse.json({ success: true, titles, fromCache: false });
  } catch (err) {
    console.error('similar fetch failed', err);
    return NextResponse.json({ success: true, titles: [] });
  }
}
