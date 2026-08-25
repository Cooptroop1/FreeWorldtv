import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { CACHE_TTL_SECONDS, catalogKey, isAllowedRegion, previousCatalogKey } from '@/lib/regions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || '';

function processTitle(t: Record<string, unknown>) {
  return {
    id: Number(t.id),
    title: String(t.title || t.name || 'Unknown Title'),
    year: t.year ? Number(t.year) : undefined,
    type: t.type ? String(t.type) : undefined,
    poster: (t.poster || t.image_url || null) as string | null,
    popularity: Number(t.popularity || 0),
    genre_names: Array.isArray(t.genre_names) ? t.genre_names : [],
    tmdb_id: t.tmdb_id ? Number(t.tmdb_id) : undefined,
  };
}

async function fetchPages(region: string, sourceType: 'free' | 'sub', maxPages: number) {
  const seen = new Set<number>();
  const titles: ReturnType<typeof processTitle>[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=${sourceType}&regions=${region}&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) break;
    const data = await res.json();
    const batch = data.titles || [];
    if (!batch.length) break;
    for (const t of batch) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        titles.push(processTitle(t));
      }
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return titles;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'full';
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  if (!isAllowedRegion(regionRaw)) {
    return NextResponse.json({ error: 'Unsupported region' }, { status: 400 });
  }
  const region = regionRaw;
  const maxPages = mode === 'daily' ? 2 : 20;

  const freeTitles = await fetchPages(region, 'free', maxPages);
  const premiumTitles = await fetchPages(region, 'sub', maxPages);

  const freeKey = catalogKey(false, region);
  const premiumKey = catalogKey(true, region);

  if (mode === 'full') {
    const oldFree = await kv.get(freeKey);
    if (Array.isArray(oldFree) && oldFree.length > 0) {
      await kv.set(previousCatalogKey(region), oldFree, { ex: CACHE_TTL_SECONDS });
    }
    await kv.set(freeKey, freeTitles, { ex: CACHE_TTL_SECONDS });
    await kv.set(premiumKey, premiumTitles, { ex: CACHE_TTL_SECONDS });
    await kv.set('lastFullRefresh', Date.now());
  } else {
    const currentFree: typeof freeTitles = (await kv.get(freeKey)) || [];
    const currentPremium: typeof premiumTitles = (await kv.get(premiumKey)) || [];
    const freeIds = new Set(freeTitles.map((t) => t.id));
    const premiumIds = new Set(premiumTitles.map((t) => t.id));
    const mergedFree = [...freeTitles, ...currentFree.filter((t) => !freeIds.has(t.id))];
    const mergedPremium = [...premiumTitles, ...currentPremium.filter((t) => !premiumIds.has(t.id))];
    await kv.set(freeKey, mergedFree, { ex: CACHE_TTL_SECONDS });
    await kv.set(premiumKey, mergedPremium, { ex: CACHE_TTL_SECONDS });
    await kv.set('lastDailyRefresh', Date.now());
  }

  const storedFree: unknown[] = (await kv.get(freeKey)) || [];
  const storedPremium: unknown[] = (await kv.get(premiumKey)) || [];

  return NextResponse.json({
    success: true,
    mode,
    region,
    freeTitles: Array.isArray(storedFree) ? storedFree.length : 0,
    premiumTitles: Array.isArray(storedPremium) ? storedPremium.length : 0,
    message: mode === 'full'
      ? `Replaced ${region} catalogs (no merge)`
      : `Smart daily merge for ${region}`,
  });
}
