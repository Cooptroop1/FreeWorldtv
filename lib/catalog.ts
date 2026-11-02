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

async function detailsFromWatchmode(_id: number): Promise<CatalogTitle | null> {
  return null;
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
