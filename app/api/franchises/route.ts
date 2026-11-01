import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { activeRegions } from '@/lib/watchmode-plan';
import { buildFranchiseSets } from '@/lib/franchises';
import {
  catalogPageKey,
  catalogPageMetaKey,
  franchiseSetsKey,
  type CatalogPageMeta,
} from '@/lib/catalog-pages';
import type { CatalogTitle } from '@/lib/watchmode-list';
import { CACHE_TTL_SECONDS } from '@/lib/regions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function titlesFromPages(paid: boolean, region: string): Promise<CatalogTitle[] | null> {
  const meta = await kv.get<CatalogPageMeta>(catalogPageMetaKey(paid, region));
  if (!meta?.pages || !meta.count) return null;
  const all: CatalogTitle[] = [];
  for (let start = 1; start <= meta.pages; start += 20) {
    const nums: number[] = [];
    for (let p = start; p < start + 20 && p <= meta.pages; p++) nums.push(p);
    const rows = await Promise.all(
      nums.map((p) => kv.get<CatalogTitle[]>(catalogPageKey(paid, region, p)))
    );
    for (const raw of rows) {
      if (Array.isArray(raw)) all.push(...raw);
    }
  }
  return all;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const region = activeRegions().includes(regionRaw) ? regionRaw : 'GB';
  const paid = searchParams.get('paid') === 'true';
  const key = franchiseSetsKey(paid, region);

  try {
    const cached = await kv.get(key);
    if (Array.isArray(cached) && cached.length) {
      return NextResponse.json({ success: true, region, paid, franchises: cached, fromCache: true });
    }
  } catch {
    return NextResponse.json({ success: true, region, paid, franchises: [], fromCache: false });
  }

  try {
    const titles = await titlesFromPages(paid, region);
    if (!titles?.length) {
      return NextResponse.json({ success: true, region, paid, franchises: [], fromCache: false });
    }
    const franchises = buildFranchiseSets(titles);
    await kv.set(key, franchises, { ex: CACHE_TTL_SECONDS });
    return NextResponse.json({
      success: true,
      region,
      paid,
      catalogSize: titles.length,
      franchises,
      fromCache: false,
    });
  } catch {
    return NextResponse.json({ success: true, region, paid, franchises: [], fromCache: false });
  }
}
