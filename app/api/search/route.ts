import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { catalogKey } from '@/lib/regions';
import { activeRegions } from '@/lib/watchmode-plan';

export const dynamic = 'force-dynamic';

// Cache-only search. Never calls Watchmode (the old version did 1+N live API calls).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim().slice(0, 80);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const paid = searchParams.get('paid') === 'true';

  if (!query) {
    return NextResponse.json({ success: false, error: 'Missing search query' }, { status: 400 });
  }
  if (!activeRegions().includes(regionRaw)) {
    return NextResponse.json({ success: false, error: 'Unsupported region' }, { status: 400 });
  }

  const catalog = (await kv.get<{ id: number; title: string }[]>(catalogKey(paid, regionRaw))) || [];
  const q = query.toLowerCase();
  const titles = catalog.filter((t) => t.title?.toLowerCase().includes(q)).slice(0, 50);

  return NextResponse.json({
    success: true,
    titles,
    totalResults: titles.length,
    message: `Found ${titles.length} matches for "${query}" in ${regionRaw} catalog`,
  });
}
