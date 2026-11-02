export type CatalogTitle = {
  id: number;
  title: string;
  year?: number;
  type?: string;
  poster: string | null;
  popularity: number;
  genre_names: string[];
  tmdb_id?: number;
};

function processTitle(t: Record<string, unknown>): CatalogTitle {
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

export async function fetchWatchmodePages(opts: {
  region: string;
  sourceType: 'free' | 'sub';
  maxPages: number;
  startPage?: number;
}): Promise<{ titles: CatalogTitle[]; ok: boolean; error?: string; pages: number; lastPage: number; exhausted: boolean }> {
  return { titles: [], ok: true, pages: 0, lastPage: 0, exhausted: true };
}

