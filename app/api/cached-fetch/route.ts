import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  ALLOWED_REGIONS,
  CACHE_TTL_SECONDS,
  catalogKey,
  isAllowedRegion,
  previousCatalogKey,
} from '@/lib/regions';

export const dynamic = 'force-dynamic';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || '';
const PAGE_SIZE = 48;
const MAX_BUILD_PAGES = 20;

interface Title {
  id: number;
  title: string;
  year?: number;
  type?: string;
  poster?: string | null;
  popularity?: number;
  genre_names?: string[];
  tmdb_id?: number;
  imdb_rating?: number;
  tmdb_rating?: number;
  vote_average?: number;
  [key: string]: unknown;
}

function processTitle(t: Record<string, unknown>): Title {
  return {
    id: Number(t.id),
    title: String(t.title || t.name || 'Unknown Title'),
    year: t.year ? Number(t.year) : undefined,
    type: t.type ? String(t.type) : undefined,
    poster: (t.poster || t.image_url || null) as string | null,
    popularity: Number(t.popularity || 0),
    genre_names: Array.isArray(t.genre_names) ? (t.genre_names as string[]) : [],
    tmdb_id: t.tmdb_id ? Number(t.tmdb_id) : undefined,
    imdb_rating: t.imdb_rating ? Number(t.imdb_rating) : undefined,
    tmdb_rating: t.tmdb_rating ? Number(t.tmdb_rating) : undefined,
    vote_average: t.vote_average ? Number(t.vote_average) : undefined,
  };
}

async function fetchWatchmodePage(
  region: string,
  sourceType: 'free' | 'sub',
  page: number,
  types: string
): Promise<Record<string, unknown>[]> {
  if (!WATCHMODE_API_KEY) return [];
  const url =
    `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}` +
    `&source_types=${sourceType}` +
    `&regions=${region}` +
    `&types=${encodeURIComponent(types)}` +
    `&sort_by=popularity_desc` +
    `&page=${page}` +
    `&limit=250`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`[cached-fetch] Watchmode error ${res.status} for ${region} ${sourceType} page ${page}`);
    return [];
  }
  const json = await res.json();
  return json.titles || [];
}

async function buildRegionCatalog(region: string, paid: boolean): Promise<Title[]> {
  const sourceType = paid ? 'sub' : 'free';
  const seen = new Set<number>();
  const results: Title[] = [];

  for (let p = 1; p <= MAX_BUILD_PAGES; p++) {
    const titles = await fetchWatchmodePage(region, sourceType, p, 'movie,tv_series');
    if (!titles.length) break;
    for (const t of titles) {
      const id = Number(t.id);
      if (!seen.has(id)) {
        seen.add(id);
        results.push(processTitle(t));
      }
    }
    if (p < MAX_BUILD_PAGES) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return results;
}

function applyFilters(
  catalog: Title[],
  query: string | null,
  types: string,
  fromYear: number,
  toYear: number,
  minRating: number
): Title[] {
  let filtered = [...catalog];

  if (types !== 'movie,tv_series') {
    filtered = filtered.filter((t) => t.type === types);
  }

  if (fromYear > 0 || toYear < 3000) {
    filtered = filtered.filter((t) => {
      const y = t.year || 0;
      return y >= fromYear && y <= toYear;
    });
  }

  if (minRating > 0) {
    filtered = filtered.filter((t) => {
      const rating = t.imdb_rating || t.tmdb_rating || t.vote_average || 0;
      return rating >= minRating;
    });
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter((t) => t.title?.toLowerCase().includes(q));
  }

  return filtered;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  if (!isAllowedRegion(regionRaw)) {
    return NextResponse.json(
      { success: false, error: 'Unsupported region', allowed: ALLOWED_REGIONS },
      { status: 400 }
    );
  }
  const region = regionRaw;

  const paid = searchParams.get('paid') === 'true';
  const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1), 200);
  const queryRaw = searchParams.get('query')?.trim() || null;
  const query = queryRaw ? queryRaw.slice(0, 80) : null;
  const section = searchParams.get('section');
  const types = searchParams.get('types') || 'movie,tv_series';
  const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
  const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
  const minRating = parseInt(searchParams.get('minRating') || '0', 10);

  const key = catalogKey(paid, region);
  let catalog: Title[] = (await kv.get<Title[]>(key)) || [];
  const isFromCache = catalog.length > 0;

  if (!catalog.length) {
    const lockKey = `build_lock:${key}`;
    const lock = await kv.get(lockKey);
    if (lock) {
      return NextResponse.json({
        success: true,
        titles: [],
        page,
        hasMore: false,
        totalAvailable: 0,
        region,
        fromCache: false,
        building: true,
        message: 'Catalog is building, try again shortly',
      });
    }

    await kv.set(lockKey, '1', { ex: 180 });
    try {
      catalog = await buildRegionCatalog(region, paid);
      if (catalog.length > 0) {
        if (!paid) {
          const existing = await kv.get<Title[]>(key);
          if (existing && existing.length > 0) {
            await kv.set(previousCatalogKey(region), existing, { ex: CACHE_TTL_SECONDS });
          }
        }
        await kv.set(key, catalog, { ex: CACHE_TTL_SECONDS });
      }
    } finally {
      await kv.del(lockKey);
    }
  }

  if (section === 'random') {
    const filtered = applyFilters(catalog, null, types, fromYear, toYear, minRating);
    if (!filtered.length) {
      return NextResponse.json({ success: true, titles: [], region, fromCache: isFromCache });
    }
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    return NextResponse.json({ success: true, titles: [pick], region, fromCache: isFromCache });
  }

  if (section === 'trending') {
    const filtered = applyFilters(catalog, null, types, 0, 3000, 0);
    const sorted = [...filtered].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return NextResponse.json({
      success: true,
      titles: sorted.slice(0, 20),
      region,
      fromCache: isFromCache,
    });
  }

  if (section === 'new-releases' && !paid) {
    const previousRaw = await kv.get(previousCatalogKey(region));
    const previous: Title[] = Array.isArray(previousRaw) ? previousRaw : [];
    const prevIds = new Set(previous.map((t) => t.id));
    let newTitles = catalog.filter((t) => !prevIds.has(t.id));
    if (newTitles.length === 0) {
      newTitles = [...catalog].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 20);
    } else {
      newTitles.sort((a, b) => (b.year || 0) - (a.year || 0));
      newTitles = newTitles.slice(0, 20);
    }
    return NextResponse.json({
      success: true,
      titles: newTitles,
      region,
      fromCache: isFromCache,
    });
  }

  const filtered = applyFilters(catalog, query, types, fromYear, toYear, minRating);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const hasMore = start + PAGE_SIZE < filtered.length;

  return NextResponse.json({
    success: true,
    titles: pageItems,
    page,
    hasMore,
    totalAvailable: filtered.length,
    region,
    fromCache: isFromCache,
    builtOnDemand: !isFromCache,
  });
}
