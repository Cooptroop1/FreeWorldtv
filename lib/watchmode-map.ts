// lib/watchmode-map.ts
let watchmodeMap: Map<number, number> | null = null; // TMDB ID → Watchmode ID
let lastFetched = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getWatchmodeId(tmdbId: number): Promise<number | null> {
  const now = Date.now();
  // Refresh cache once per day
  if (!watchmodeMap || now - lastFetched > CACHE_DURATION) {
    console.log('📥 Fetching latest Watchmode title_id_map.csv...');
    try {
      const res = await fetch('https://api.watchmode.com/datasets/title_id_map.csv', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch CSV');
      const csvText = await res.text();
      const map = new Map<number, number>();
      const lines = csvText.trim().split('\n');
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns.length < 3) continue;
        const watchmodeId = parseInt(columns[0].replace(/"/g, ''), 10);
        const tmdbIdStr = columns[2].replace(/"/g, '').trim();
        const tmdbIdNum = parseInt(tmdbIdStr, 10);
        if (!isNaN(watchmodeId) && !isNaN(tmdbIdNum) && tmdbIdNum > 0) {
          map.set(tmdbIdNum, watchmodeId);
        }
      }
      watchmodeMap = map;
      lastFetched = now;
      console.log(`✅ Watchmode map loaded: ${map.size.toLocaleString()} titles`);
    } catch (err) {
      console.error('Failed to load Watchmode CSV:', err);
      if (!watchmodeMap) watchmodeMap = new Map(); // fallback empty map
    }
  }
  return watchmodeMap?.get(tmdbId) ?? null;
}

// Optional: bulk lookup (for future use)
export async function getWatchmodeIds(tmdbIds: number[]): Promise<Record<number, number>> {
  const result: Record<number, number> = {};
  for (const id of tmdbIds) {
    const wmId = await getWatchmodeId(id);
    if (wmId) result[id] = wmId;
  }
  return result;
}

// =============================================
// NEW: LOCAL PROVIDER LOGO MAPPING
// These point to the 3 images you saved in public/providers/
// =============================================
export const providerLogos: Record<string, string> = {
  "Tubi": "/providers/tubi.png",
  "Pluto TV": "/providers/pluto-tv.png",
  "Freevee": "/providers/freevee.png",
  "Amazon Freevee": "/providers/freevee.png",   // some titles return this exact name
  // ← Add more here later exactly like this (e.g. "The Roku Channel", "Crackle", etc.)
};
