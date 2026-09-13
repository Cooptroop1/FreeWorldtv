import { NextResponse } from 'next/server';
import { catalogKey } from '@/lib/regions';
import { kv } from '@vercel/kv';
import { activeRegions } from '@/lib/watchmode-plan';
import { buildFranchiseSets } from '@/lib/franchises';
import type { CatalogTitle } from '@/lib/watchmode-list';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const region = activeRegions().includes(regionRaw) ? regionRaw : 'GB';
  const paid = searchParams.get('paid') === 'true';
  const catalog = ((await kv.get(catalogKey(paid, region))) || []) as CatalogTitle[];
  const list = Array.isArray(catalog) ? catalog : [];
  const franchises = buildFranchiseSets(list);
  return NextResponse.json({
    success: true,
    region,
    paid,
    catalogSize: list.length,
    franchises,
  });
}
