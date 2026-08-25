import { kv } from '@vercel/kv';
import { catalogKey } from '@/lib/regions';

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

export async function findTitleById(
  id: number,
  preferredRegion = 'GB'
): Promise<(CatalogTitle & { region: string; paid: boolean }) | null> {
  const regions = Array.from(new Set([preferredRegion, 'GB', 'US']));
  for (const region of regions) {
    for (const paid of [false, true]) {
      const catalog = (await kv.get<CatalogTitle[]>(catalogKey(paid, region))) || [];
      const hit = catalog.find((t) => Number(t.id) === id);
      if (hit) return { ...hit, region, paid };
    }
  }
  return null;
}

export async function listSitemapTitles(limit = 400): Promise<CatalogTitle[]> {
  const catalog = (await kv.get<CatalogTitle[]>(catalogKey(false, 'GB'))) || [];
  return catalog.slice(0, limit);
}
