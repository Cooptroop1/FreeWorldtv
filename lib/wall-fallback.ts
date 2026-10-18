import type { CatalogTitle } from '@/lib/watchmode-list';

const UI_PAGE = 48;
/** One Watchmode page is 250 titles. Never walk past 2 pages from a visitor request. */
const MAX_WM_PAGE = 2;

function mapTitle(t: Record<string, unknown>): CatalogTitle {
  return {
    id: Number(t.id),
    title: String(t.title || t.name || 'Unknown Title'),
    year: t.year ? Number(t.year) : undefined,
    type: t.type ? String(t.type) : undefined,
    poster: (t.poster || t.image_url || null) as string | null,
    popularity: Number(t.popularity || 0),
    genre_names: Array.isArray(t.genre_names) ? (t.genre_names as string[]) : [],
    tmdb_id: t.tmdb_id ? Number(t.tmdb_id) : undefined,
  };
}

/** Vercel data cache, not Upstash. One Watchmode call per country per 12 hours. */
export async function cachedWatchmodePage(
  region: string,
  paid: boolean,
  wmPage: number
): Promise<CatalogTitle[]> {
  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey || wmPage < 1 || wmPage > MAX_WM_PAGE) return [];
  const url =
    `https://api.watchmode.com/v1/list-titles/?apiKey=${apiKey}` +
    `&source_types=${paid ? 'sub' : 'free'}&regions=${region}` +
    `&types=movie,tv_series&sort_by=popularity_desc&page=${wmPage}&limit=250`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 12 } });
    if (!res.ok) return [];
    const data = await res.json();
    const batch = Array.isArray(data.titles) ? data.titles : [];
    return batch.map((t: Record<string, unknown>) => mapTitle(t)).filter((t: CatalogTitle) => t.id);
  } catch (err) {
    console.error('watchmode list fallback failed', err);
    return [];
  }
}

export async function fallbackUiPage(region: string, paid: boolean, uiPage: number) {
  const start = Math.max(0, (uiPage - 1) * UI_PAGE);
  const wmPage = Math.floor(start / 250) + 1;
  if (wmPage > MAX_WM_PAGE) {
    return { titles: [] as CatalogTitle[], hasMore: false, total: MAX_WM_PAGE * 250 };
  }
  const rows = await cachedWatchmodePage(region, paid, wmPage);
  const offset = start % 250;
  const titles = rows.slice(offset, offset + UI_PAGE);
  const hasMore = wmPage < MAX_WM_PAGE && offset + UI_PAGE < rows.length;
  return { titles, hasMore, total: MAX_WM_PAGE * 250 };
}
