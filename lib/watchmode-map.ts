// Server-only Watchmode ID map. Do not import this from client components.
let watchmodeMap: Map<number, number> | null = null;
let lastFetched = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getWatchmodeId(tmdbId: number): Promise<number | null> {
  const now = Date.now();
  if (!watchmodeMap || now - lastFetched > CACHE_DURATION) {
    try {
      const apiKey = process.env.WATCHMODE_API_KEY || '';
      const url = apiKey
        ? `https://api.watchmode.com/datasets/title_id_map.csv?apiKey=${apiKey}`
        : 'https://api.watchmode.com/datasets/title_id_map.csv';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
      const csvText = await res.text();
      const map = new Map<number, number>();
      const lines = csvText.trim().split('\n');
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns.length < 3) continue;
        const watchmodeId = parseInt(columns[0].replace(/"/g, ''), 10);
        const tmdbIdNum = parseInt(columns[2].replace(/"/g, '').trim(), 10);
        if (!isNaN(watchmodeId) && !isNaN(tmdbIdNum) && tmdbIdNum > 0) {
          map.set(tmdbIdNum, watchmodeId);
        }
      }
      watchmodeMap = map;
      lastFetched = now;
    } catch (err) {
      console.error('Failed to load Watchmode CSV:', err);
      if (!watchmodeMap) watchmodeMap = new Map();
    }
  }
  return watchmodeMap?.get(tmdbId) ?? null;
}

export { providerLogos } from './provider-logos';
