import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// =====================================================
// UPDATED: Region-aware lazy caching + on-demand build
// =====================================================
// - First person to select a country (e.g. GB) triggers build of ~20 pages free + ~20 pages paid
// - Stores in KV: free_catalog:GB  and  premium_catalog:GB  (30-day TTL)
// - Subsequent users get instant cache hits (zero extra Watchmode calls)
// - Mimics the exact pattern used by /api/title-sources for individual video links
// =====================================================

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY!;
const PAGE_SIZE = 48;                    // Keep 48 for current frontend hasMore logic compatibility
const MAX_BUILD_PAGES = 20;              // Build up to 20 Watchmode pages per type per region (~5000 titles max)
const CACHE_TTL_SECONDS = 86400 * 30;    // 30 days

// Auto-refresh settings (kept from original)
const FULL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback-secret-for-local-dev-only';

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
  [key: string]: any;
}

// Lightweight processing (same as refresh-all-free)
function processTitle(t: any): Title {
  return {
    id: t.id,
    title: t.title || t.name || 'Unknown Title',
    year: t.year,
    type: t.type,
    poster: t.poster || t.image_url || null,
    popularity: t.popularity || 0,
    genre_names: Array.isArray(t.genre_names) ? t.genre_names : [],
    tmdb_id: t.tmdb_id,
    imdb_rating: t.imdb_rating,
    tmdb_rating: t.tmdb_rating,
    vote_average: t.vote_average,
  };
}

// Fetch one page from Watchmode list-titles
async function fetchWatchmodePage(
  region: string,
  sourceType: 'free' | 'sub',
  page: number,
  types: string
): Promise<any[]> {
  const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}` +
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

// === BUILD ON-DEMAND for a specific region (lazy, only runs on first miss) ===
async function buildRegionCatalog(region: string, paid: boolean): Promise<Title[]> {
  const sourceType = paid ? 'sub' : 'free';
  const catalogType = paid ? 'premium' : 'free';

  console.log(`[cached-fetch] 🔥 BUILDING ${catalogType.toUpperCase()} catalog for region=${region} (up to ${MAX_BUILD_PAGES} pages)`);

  const seen = new Set<number>();
  const results: Title[] = [];

  for (let p = 1; p <= MAX_BUILD_PAGES; p++) {
    const titles = await fetchWatchmodePage(region, sourceType, p, 'movie,tv_series');

    if (!titles.length) {
      console.log(`[cached-fetch] No more results for ${region} ${sourceType} at page ${p}`);
      break;
    }

    for (const t of titles) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        results.push(processTitle(t));
      }
    }

    // Small delay to be nice to Watchmode
    if (p < MAX_BUILD_PAGES) {
      await new Promise(r => setTimeout(r, 350));
    }
  }

  console.log(`[cached-fetch] ✅ Built ${results.length} titles for ${catalogType}:${region}`);
  return results;
}

// Apply filters (search, types, year, rating) - same logic as before
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
    filtered = filtered.filter((t) =>
      t.title?.toLowerCase().includes(q)
    );
  }

  return filtered;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const region = (searchParams.get('region') || 'US').toUpperCase();
  const paid = searchParams.get('paid') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const query = searchParams.get('query')?.trim() || null;
  const section = searchParams.get('section');
  const types = searchParams.get('types') || 'movie,tv_series';
  const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
  const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
  const minRating = parseInt(searchParams.get('minRating') || '0', 10);

  const callTime = new Date().toISOString();
  console.log(`[${callTime}] cached-fetch | region=${region} | paid=${paid} | page=${page} | query=${query || 'none'}`);

  // === AUTO FULL REFRESH TRIGGER (kept from original, only for global US) ===
  if (!query && region === 'US' && !paid) {
    try {
      const lastFull = (await kv.get<number>('lastFullRefresh')) || 0;
      const now = Date.now();
      const lock = await kv.get('refresh_lock');

      if (!lock && now - lastFull > FULL_INTERVAL_MS) {
        await kv.set('refresh_lock', '1', { ex: 300 });
        const host = request.headers.get('host') || 'freestreamworld.com';
        const url = `https://${host}/api/refresh-all-free?secret=${REFRESH_SECRET}&mode=full`;

        fetch(url, { cache: 'no-store' })
          .then(() => kv.del('refresh_lock'))
          .catch(() => kv.del('refresh_lock'));

        console.log(`[${callTime}] 🔥 AUTO FULL REFRESH triggered for US`);
      }
    } catch (e) {
      console.error('Auto-refresh check failed:', e);
    }
  }

  // === REGION-SPECIFIC CACHE KEYS ===
  const catalogKey = paid
    ? `premium_catalog:${region}`
    : `free_catalog:${region}`;

  // Try cache first
  let catalog: Title[] = (await kv.get<Title[]>(catalogKey)) || [];

  const isFromCache = catalog.length > 0;

  // === ON-DEMAND BUILD IF CACHE MISS ===
  if (!catalog.length) {
    console.log(`[${callTime}] CACHE MISS for ${region} (${paid ? 'premium' : 'free'}) — building now...`);
    catalog = await buildRegionCatalog(region, paid);

    if (catalog.length > 0) {
      await kv.set(catalogKey, catalog, { ex: CACHE_TTL_SECONDS });
      console.log(`[${callTime}] Stored ${catalog.length} titles in KV for ${catalogKey}`);
    } else {
      console.warn(`[${callTime}] Build returned 0 titles for ${region}`);
    }
  } else {
    console.log(`[${callTime}] CACHE HIT for ${region} (${paid ? 'premium' : 'free'}) — ${catalog.length} titles`);
  }

  // === SPECIAL SECTIONS (trending / new-releases) — work on region catalog ===
  if (section === 'trending') {
    const sorted = [...catalog].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return NextResponse.json({
      success: true,
      titles: sorted.slice(0, 20),
      region,
      fromCache: isFromCache,
    });
  }

  if (section === 'new-releases' && !paid) {
    // For simplicity we use the same catalog (new-releases logic can be enhanced later)
    const previousRaw = await kv.get('previous_free_catalog');
    const previous: any[] = Array.isArray(previousRaw) ? previousRaw : [];
    const prevIds = new Set(previous.map((t: any) => t.id));
    let newTitles = catalog.filter((t) => !prevIds.has(t.id));
    newTitles.sort((a, b) => (b.year || 0) - (a.year || 0));
    return NextResponse.json({
      success: true,
      titles: newTitles.slice(0, 20),
      region,
      fromCache: isFromCache,
    });
  }

  // === NORMAL PAGINATED + FILTERED RESPONSE ===
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
