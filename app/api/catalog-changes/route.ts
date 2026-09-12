import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { isAllowedRegion } from '@/lib/regions';
import { listedKey, previousListedKey } from '@/lib/account';
import type { CatalogTitle } from '@/lib/watchmode-list';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  if (!isAllowedRegion(regionRaw)) {
    return NextResponse.json({ success: false, error: 'Unsupported region' }, { status: 400 });
  }

  const current = ((await kv.get(listedKey(regionRaw))) || []) as CatalogTitle[];
  const previous = ((await kv.get(previousListedKey(regionRaw))) || []) as CatalogTitle[];
  const curr = Array.isArray(current) ? current : [];
  const prev = Array.isArray(previous) ? previous : [];

  if (!prev.length || !curr.length) {
    return NextResponse.json({
      success: true,
      region: regionRaw,
      arrived: [],
      left: [],
      message: 'Need two catalogue snapshots before new/leaving rows appear.',
    });
  }

  const currIds = new Set(curr.map((t) => t.id));
  const prevIds = new Set(prev.map((t) => t.id));
  const arrived = curr.filter((t) => !prevIds.has(t.id)).slice(0, 24);
  const left = prev.filter((t) => !currIds.has(t.id)).slice(0, 24);

  return NextResponse.json({
    success: true,
    region: regionRaw,
    arrived,
    left,
  });
}
