import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  CATALOG_TARGET,
  isAllowedRegion,
} from '@/lib/regions';
import { activeRegions } from '@/lib/watchmode-plan';
import { listedKey, previousListedKey } from '@/lib/account';
import {
  catalogPageReadsEnabled,
  readCatalogPage,
  CATALOG_PAGE_SIZE,
} from '@/lib/catalog-pages';
import { cachedWatchmodePage, fallbackUiPage } from '@/lib/wall-fallback';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAGE_SIZE = CATALOG_PAGE_SIZE;

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

function plainBrowse(opts: {
  query: string | null;
  section: string | null;
  types: string;
  fromYear: number;
  toYear: number;
  minRating: number;
  genre: string | null;
}) {
  return (
    !opts.query &&
    !opts.section &&
    opts.types === 'movie,tv_series' &&
    opts.fromYear <= 0 &&
    opts.toYear >= 3000 &&
    opts.minRating <= 0 &&
    !opts.genre
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const allowed = activeRegions();
  if (!allowed.includes(regionRaw) && !isAllowedRegion(regionRaw)) {
    return NextResponse.json(
      { success: false, error: 'Unsupported region', allowed },
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
  const plain = plainBrowse({ query, section, types, fromYear, toYear, minRating, genre });

  if (section === 'new-releases' && !paid) {
    return NextResponse.json({
      success: true,
      titles: await newOnFreeList(region),
      region,
      fromCache: true,
    });
  }

  if (plain || section === 'trending' || section === 'random') {
    const slice = await loadSlice(paid, region, section ? 1 : page);
    if (section === 'trending') {
      let list = slice.titles;
      if (types !== 'movie,tv_series') list = list.filter((t) => t.type === types);
      if (genre) {
        const g = genre.toLowerCase();
        list = list.filter((t) => (t.genre_names || []).some((name) => String(name).toLowerCase().includes(g)));
      }
      const sorted = [...list].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20);
      return NextResponse.json({ success: true, titles: sorted, region, fromCache: slice.fromCache });
    }
    if (section === 'random') {
      const filtered = applyFilters(slice.titles, null, types, fromYear, toYear, minRating, genre);
      const pick = filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : null;
      return NextResponse.json({ success: true, titles: pick ? [pick] : [], region, fromCache: slice.fromCache });
    }
    return NextResponse.json({
      success: true,
      titles: slice.titles,
      page,
      hasMore: slice.hasMore && slice.titles.length > 0,
      totalAvailable: slice.total,
      region,
      fromCache: slice.fromCache,
      catalogEmpty: slice.titles.length === 0 && page === 1,
      seeded: false,
      paged: slice.fromCache,
      wall: {
        size: slice.total,
        target: CATALOG_TARGET,
        added: 0,
        exhausted: true,
      },
    });
  }

  const pool = await cachedWatchmodePage(region, paid, 1);
  const filtered = applyFilters(pool, query, types, fromYear, toYear, minRating, genre);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  return NextResponse.json({
    success: true,
    titles: pageItems,
    page,
    hasMore: start + PAGE_SIZE < filtered.length,
    totalAvailable: filtered.length,
    region,
    fromCache: false,
    catalogEmpty: pool.length === 0,
    wall: {
      size: pool.length,
      target: CATALOG_TARGET,
      added: 0,
      exhausted: true,
    },
  });
}

async function newOnFreeList(region: string): Promise<Title[]> {
  try {
    const current = ((await kv.get(listedKey(region))) || []) as Title[];
    const previous = ((await kv.get(previousListedKey(region))) || []) as Title[];
    const curr = Array.isArray(current) ? current : [];
    const prev = Array.isArray(previous) ? previous : [];
    if (!curr.length) return [];
    const prevIds = new Set(prev.map((t) => t.id));
    let fresh = prev.length ? curr.filter((t) => !prevIds.has(t.id)) : [];
    if (!fresh.length) {
      fresh = [...curr].sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    return fresh.slice(0, 20);
  } catch {
    return [];
  }
}

async function loadSlice(paid: boolean, region: string, page: number): Promise<{
  titles: Title[];
  hasMore: boolean;
  total: number;
  fromCache: boolean;
}> {
  if (catalogPageReadsEnabled()) {
    try {
      const paged = await readCatalogPage(paid, region, page);
      if (paged && paged.count > 0) {
        return {
          titles: paged.titles as Title[],
          hasMore: page < paged.pages && paged.titles.length > 0,
          total: paged.count,
          fromCache: true,
        };
      }
    } catch (err) {
      console.error('catalog page read failed', err);
    }
  }
  const fb = await fallbackUiPage(region, paid, page);
  return { titles: fb.titles as Title[], hasMore: fb.hasMore, total: fb.total, fromCache: false };
}
