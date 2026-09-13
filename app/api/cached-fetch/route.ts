import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  ALLOWED_REGIONS,
  CATALOG_TARGET,
  catalogExhaustedKey,
  isAllowedRegion,
  previousCatalogKey,
} from '@/lib/regions';
import { expandCatalog, loadOrSeedCatalog } from '@/lib/ensure-catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAGE_SIZE = 48;

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

function applyFilters(
  catalog: Title[],
  query: string | null,
  types: string,
  fromYear: number,
  toYear: number,
  minRating: number,
  genre: string | null
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

  if (genre) {
    const g = genre.toLowerCase();
    filtered = filtered.filter((t) =>
      (t.genre_names || []).some((name) => String(name).toLowerCase().includes(g))
    );
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
  const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1), 450);
  const queryRaw = searchParams.get('query')?.trim() || null;
  const query = queryRaw ? queryRaw.slice(0, 80) : null;
  const section = searchParams.get('section');
  const types = searchParams.get('types') || 'movie,tv_series';
  const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
  const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
  const minRating = parseInt(searchParams.get('minRating') || '0', 10);
  const genre = searchParams.get('genre')?.trim().slice(0, 40) || null;

  const seeded = await loadOrSeedCatalog(paid, region);
  let catalog: Title[] = seeded.catalog as Title[];
  if (catalog.length === 0 && !paid) {
    const previousRaw = await kv.get(previousCatalogKey(region));
    catalog = Array.isArray(previousRaw) ? (previousRaw as Title[]) : [];
  }
  let wallAdded = 0;
  let wallExhausted = catalog.length >= CATALOG_TARGET;
  const alreadyDone = wallExhausted || Boolean(await kv.get(catalogExhaustedKey(false, region)));
  if (!paid && !section && page === 1 && catalog.length > 0 && !alreadyDone) {
    const exp = await expandCatalog(false, region, 6);
    wallAdded = exp.added;
    wallExhausted = Boolean(exp.exhausted);
    if (exp.added > 0) {
      const latest = await loadOrSeedCatalog(paid, region);
      catalog = latest.catalog as Title[];
    }
  } else if (alreadyDone) {
    wallExhausted = true;
  }
  const catalogEmpty = catalog.length === 0;

  if (catalogEmpty) {
    return NextResponse.json({
      success: true,
      titles: [],
      page,
      hasMore: false,
      totalAvailable: 0,
      region,
      fromCache: seeded.fromCache,
      catalogEmpty: true,
      building: seeded.building,
      seeded: seeded.seeded,
      message: seeded.building
        ? `${region} catalogue is being fetched from Watchmode. Retry in a few seconds.`
        : seeded.error || 'Catalog not built yet.',
    });
  }

  if (section === 'random') {
    const filtered = applyFilters(catalog, null, types, fromYear, toYear, minRating, genre);
    if (!filtered.length) {
      return NextResponse.json({ success: true, titles: [], region, fromCache: seeded.fromCache });
    }
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    return NextResponse.json({ success: true, titles: [pick], region, fromCache: seeded.fromCache });
  }

  if (section === 'trending') {
    const filtered = applyFilters(catalog, null, types, 0, 3000, 0, genre);
    const sorted = [...filtered].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return NextResponse.json({
      success: true,
      titles: sorted.slice(0, 20),
      region,
      fromCache: seeded.fromCache,
    });
  }

  if (section === 'new-releases' && !paid) {
    const previousRaw = await kv.get(previousCatalogKey(region));
    const previous: Title[] = Array.isArray(previousRaw) ? (previousRaw as Title[]) : [];
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
      fromCache: seeded.fromCache,
    });
  }

  const filtered = applyFilters(catalog, query, types, fromYear, toYear, minRating, genre);
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
    fromCache: seeded.fromCache && wallAdded === 0,
    catalogEmpty: false,
    seeded: seeded.seeded,
    wall: {
      size: catalog.length,
      target: CATALOG_TARGET,
      added: wallAdded,
      exhausted: wallExhausted,
    },
  });
}
