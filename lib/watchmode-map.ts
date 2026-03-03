// lib/watchmode-map.ts
let watchmodeMap: Map<number, number> | null = null; // TMDB ID → Watchmode ID
let lastFetched = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getWatchmodeId(tmdbId: number): Promise<number | null> {
  const now = Date.now();
  if (!watchmodeMap || now - lastFetched > CACHE_DURATION) {
    console.log('📥 Fetching latest Watchmode title_id_map.csv...');
    try {
      const res = await fetch('https://api.watchmode.com/datasets/title_id_map.csv', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch CSV');
      const csvText = await res.text();
      const map = new Map<number, number>();
      const lines = csvText.trim().split('\n');
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
      if (!watchmodeMap) watchmodeMap = new Map();
    }
  }
  return watchmodeMap?.get(tmdbId) ?? null;
}

export async function getWatchmodeIds(tmdbIds: number[]): Promise<Record<number, number>> {
  const result: Record<number, number> = {};
  for (const id of tmdbIds) {
    const wmId = await getWatchmodeId(id);
    if (wmId) result[id] = wmId;
  }
  return result;
}

// =============================================
// COMPLETE PROVIDER LOGO MAPPING
// Includes EVERY provider we've added (Hoopla, The CW, FX, NBC, Kanopy, Adult Swim, Spectrum, Prime Video, etc.)
// =============================================
export const providerLogos: Record<string, string> = {
  "Tubi": "/providers/tubi.png",
  "Tubi TV": "/providers/tubi.png",
  "Pluto TV": "/providers/pluto-tv.png",
  "Freevee": "/providers/freevee.png",
  "Amazon Freevee": "/providers/freevee.png",
  "Peacock": "/providers/peacock.png",
  "Roku Channel": "/providers/roku-channel.png",
  "The Roku Channel": "/providers/roku-channel.png",
  "CBC Gem": "/providers/cbc-gem.png",
  "MAX Free": "/providers/max.png",
  "All 4": "/providers/all-4.png",
  "Fawesome": "/providers/fawesome.png",
  "YouTube Premium Free Tier": "/providers/youtube.png",
  "YouTube": "/providers/youtube.png",
  "Plex": "/providers/plex.png",
  "PBS": "/providers/pbs.png",
  "Syfy": "/providers/syfy.png",
  "7plus": "/providers/7plus.png",
  "9Now": "/providers/9now.png",
  "Crunchyroll": "/providers/crunchyroll.png",
  "Popcornflix": "/providers/popcornflix.png",
  "Shout! Factory TV": "/providers/shout-factory-tv.png",
  "South Park Studios": "/providers/south-park-studios.png",

  // Newly added in this batch
  "Hoopla": "/providers/hoopla.png",
  "The CW": "/providers/the-cw.png",
  "CW": "/providers/the-cw.png",
  "FX": "/providers/fx.png",
  "NBC": "/providers/nbc.png",
  "Kanopy": "/providers/kanopy.png",
  "Adult Swim": "/providers/adult-swim.png",
  "Spectrum On Demand": "/providers/spectrum-on-demand.png",
  "Spectrum": "/providers/spectrum-on-demand.png",
  "Prime Video": "/providers/prime-video.png",
  "Amazon Prime Video": "/providers/prime-video.png",
};
