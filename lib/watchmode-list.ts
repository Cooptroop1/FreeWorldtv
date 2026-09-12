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
  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) {
    return { titles: [], ok: false, error: 'WATCHMODE_API_KEY missing', pages: 0, lastPage: 0, exhausted: false };
  }

  const startPage = Math.max(1, opts.startPage || 1);
  const endPage = startPage + opts.maxPages - 1;
  const seen = new Set<number>();
  const titles: CatalogTitle[] = [];
  let pages = 0;
  let lastPage = startPage - 1;
  let exhausted = false;

  for (let page = startPage; page <= endPage; page++) {
    const url =
      `https://api.watchmode.com/v1/list-titles/?apiKey=${apiKey}` +
      `&source_types=${opts.sourceType}&regions=${opts.region}` +
      `&types=movie,tv_series&sort_by=popularity_desc&page=${page}&limit=250`;

    let res: Response;
    try {
      res = await fetch(url, { cache: 'no-store' });
    } catch (err) {
      return {
        titles,
        ok: false,
        error: err instanceof Error ? err.message : 'Watchmode network error',
        pages,
        lastPage,
        exhausted,
      };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('Watchmode list-titles failed', {
        region: opts.region,
        sourceType: opts.sourceType,
        page,
        status: res.status,
        body: body.slice(0, 200),
      });
      return {
        titles,
        ok: false,
        error: `Watchmode ${res.status}`,
        pages,
        lastPage,
        exhausted,
      };
    }

    const data = await res.json();
    const batch = Array.isArray(data.titles) ? data.titles : [];
    pages += 1;
    lastPage = page;
    if (!batch.length) {
      exhausted = true;
      break;
    }

    for (const t of batch) {
      const id = Number(t.id);
      if (!seen.has(id)) {
        seen.add(id);
        titles.push(processTitle(t));
      }
    }

    const totalPages = Number(data.total_pages || 0);
    if (totalPages && page >= totalPages) {
      exhausted = true;
      break;
    }

    if (page < endPage) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { titles, ok: true, pages, lastPage, exhausted };
}
