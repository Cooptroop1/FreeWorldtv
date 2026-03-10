import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// === CHANGE THIS NUMBER ANYTIME YOU WANT ===
const REFRESH_INTERVAL_HOURS = 72;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const paid = searchParams.get('paid') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // === AUTO-REFRESH ===
  const intervalMs = REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
  try {
    const lastRefresh = await kv.get<number>('lastFullRefresh') || 0;
    if (Date.now() - lastRefresh > intervalMs && !query && !paid) {
      const host = request.headers.get('host');
      fetch(`https://${host}/api/refresh-all-free?secret=mySuperSecretRefreshKey2026xyz123`, {
        cache: 'no-store'
      }).catch(() => {});
    }
  } catch (e) {}

  // FREE SECTION
  if (!paid) {
    const raw = await kv.get('full_free_catalog');
    let catalog: any[] = Array.isArray(raw) ? raw : [];

    // === TYPES FILTER (Movies / TV / All) ===
    const types = searchParams.get('types') || 'movie,tv_series';
    if (types !== 'movie,tv_series') {
      catalog = catalog.filter((t: any) => t.type === types);
    }

        // === FIXED GENRE FILTER (now works with your exact dropdown: Action, Animation, Science Fiction, etc.) ===
    let genre = searchParams.get('genre')?.trim();
    if (genre && genre.toLowerCase() !== 'all') {
      const term = genre.toLowerCase().trim();
      catalog = catalog.filter((t: any) => {
        const genreList = [
          ...(Array.isArray(t.genre_names) ? t.genre_names : []),
          ...(Array.isArray(t.genres) ? t.genres : []),
          ...(t.genre ? [t.genre] : [])
        ];
        return genreList.some((g: any) => {
          if (!g) return false;
          const gStr = String(g).toLowerCase().trim();
          return gStr.includes(term) || 
                 term.includes(gStr) ||
                 gStr.replace(/&/g, 'and').includes(term.replace(/&/g, 'and'));
        });
      });
    }

    // === YEAR RANGE FILTER (From Year / To Year) ===
    const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
    const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
    if (fromYear > 0 || toYear < 3000) {
      catalog = catalog.filter((t: any) => {
        const y = t.year || 0;
        return y >= fromYear && y <= toYear;
      });
    }

    // === MINIMUM RATING FILTER ===
    const minRating = parseInt(searchParams.get('minRating') || '0', 10);
    if (minRating > 0) {
      catalog = catalog.filter((t: any) => {
        const rating = t.imdb_rating || t.tmdb_rating || t.vote_average || 0;
        return rating >= minRating;
      });
    }

    const section = searchParams.get('section');

    // TRENDING
    if (section === 'trending') {
      const sorted = [...catalog].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      return NextResponse.json({ success: true, titles: sorted.slice(0, 20) });
    }

    // NEW RELEASES
    if (section === 'new-releases') {
      const previousRaw = await kv.get('previous_free_catalog');
      const previous: any[] = Array.isArray(previousRaw) ? previousRaw : [];
      const prevIds = new Set(previous.map((t: any) => t.id));
      let newTitles = catalog.filter((t: any) => !prevIds.has(t.id));
      newTitles.sort((a, b) => (b.year || 0) - (a.year || 0));
      return NextResponse.json({ success: true, titles: newTitles.slice(0, 20) });
    }

    // SEARCH
    if (query) {
      const filtered = catalog.filter((t: any) =>
        t.title?.toLowerCase().includes(query.toLowerCase())
      );
      return NextResponse.json({
        success: true,
        titles: filtered.slice((page - 1) * 48, page * 48)
      });
    }

    // NORMAL GRID
    const start = (page - 1) * 48;
    return NextResponse.json({
      success: true,
      titles: catalog.slice(start, start + 48)
    });
  }

  // PREMIUM SECTION (same filters as free)
  const rawPremium = await kv.get('full_premium_catalog');
  let catalogPremium: any[] = Array.isArray(rawPremium) ? rawPremium : [];

  const types = searchParams.get('types') || 'movie,tv_series';
  if (types !== 'movie,tv_series') {
    catalogPremium = catalogPremium.filter((t: any) => t.type === types);
  }

  // Genre, Year, Rating for Premium too
  let genre = searchParams.get('genre')?.trim();
  if (genre && genre.toLowerCase() !== 'all') {
    const genreLower = genre.toLowerCase().trim();
    const genreSynonyms: Record<string, string[]> = {
      'science fiction': ['sci-fi & fantasy', 'sci-fi', 'science fiction'],
      'family': ['family', 'kids & family'],
      'action': ['action', 'action & adventure'],
      'adventure': ['adventure', 'action & adventure'],
    };
    catalogPremium = catalogPremium.filter((t: any) => {
      if (!Array.isArray(t.genre_names)) return false;
      return t.genre_names.some((g: string) => {
        const gLower = g.toLowerCase().trim();
        if (gLower === genreLower || gLower.includes(genreLower) || genreLower.includes(gLower)) return true;
        const synonyms = genreSynonyms[genreLower] || [];
        return synonyms.some(syn => gLower.includes(syn) || syn.includes(gLower));
      });
    });
  }

  const fromYear = parseInt(searchParams.get('fromYear') || '0', 10);
  const toYear = parseInt(searchParams.get('toYear') || '3000', 10);
  if (fromYear > 0 || toYear < 3000) {
    catalogPremium = catalogPremium.filter((t: any) => {
      const y = t.year || 0;
      return y >= fromYear && y <= toYear;
    });
  }

  const minRating = parseInt(searchParams.get('minRating') || '0', 10);
  if (minRating > 0) {
    catalogPremium = catalogPremium.filter((t: any) => {
      const rating = t.imdb_rating || t.tmdb_rating || t.vote_average || 0;
      return rating >= minRating;
    });
  }

  const start = (page - 1) * 48;
  return NextResponse.json({
    success: true,
    titles: catalogPremium.slice(start, start + 48)
  });
}
