import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { catalogKey, isAllowedRegion } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1), 50);
  const contentType = searchParams.get('type') || 'movie,tv_series';

  if (!isAllowedRegion(regionRaw)) {
    return NextResponse.json({ success: false, error: 'Unsupported region' }, { status: 400 });
  }

  let titles = ((await kv.get<{ type?: string; popularity?: number }[]>(catalogKey(false, regionRaw))) || []);
  if (contentType !== 'movie,tv_series') {
    titles = titles.filter((t) => t.type === contentType);
  }
  titles = [...titles].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const pageSize = 20;
  const slice = titles.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    success: true,
    region: regionRaw,
    page,
    titles: slice,
    totalResults: titles.length,
    message: 'Served from catalog cache (no live Watchmode call)',
  });
}
