import { cache } from 'react';
import { readCatalogPage } from '@/lib/catalog-pages';
import { cachedWatchmodePage } from '@/lib/wall-fallback';

export type CatalogTitle = {
  id: number;
  title: string;
  year?: number;
  type?: string;
  poster?: string | null;
  poster_path?: string;
  popularity?: number;
  genre_names?: string[];
  tmdb_id?: number;
  imdb_rating?: number;
  tmdb_rating?: number;
  vote_average?: number;
};

async function detailsFromWatchmode(id: number): Promise<CatalogTitle | null> {
  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.watchmode.com/v1/title/${id}/details/?apiKey=${apiKey}`,
      { next: { revalidate: 60 * 60 * 24 * 14 } }
    );
    if (!res.ok) return null;
    const t = await res.json();
    if (!t?.title) return null;
    return {
      id: Number(t.id || id),
      title: String(t.title),
      year: t.year ? Number(t.year) : undefined,
      type: t.type ? String(t.type) : undefined,
      poster: (t.poster as string | null) || null,
      popularity: Number(t.popularity || 0),
      genre_names: Array.isArray(t.genre_names) ? t.genre_names : [],
      tmdb_id: t.tmdb_id ? Number(t.tmdb_id) : undefined,
      tmdb_rating: t.user_rating ? Number(t.user_rating) : undefined,
    };
  } catch (err) {
    console.error('title details failed', err);
    return null;
  }
}

/** One title. Does not download a country list. */
export const findTitleById = cache(async (
  id: number,
  preferredRegion = 'GB'
): Promise<(CatalogTitle & { region: string; paid: boolean }) | null> => {
  const title = await detailsFromWatchmode(id);
  if (!title) return null;
  return { ...title, region: preferredRegion, paid: false };
});

export async function listSitemapTitles(limit = 400): Promise<CatalogTitle[]> {
  try {
    const pages = Math.ceil(limit / 48);
    const out: CatalogTitle[] = [];
    for (let p = 1; p <= pages; p++) {
      const slice = await readCatalogPage(false, 'GB', p);
      if (!slice?.titles.length) break;
      out.push(...slice.titles);
      if (out.length >= limit) break;
    }
    if (out.length) return out.slice(0, limit);
  } catch {
    /* page keys missing or Redis capped */
  }
  try {
    const rows = await cachedWatchmodePage('GB', false, 1);
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}
