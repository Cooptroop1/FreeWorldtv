import { kv } from '@vercel/kv';
import { isSafeHttpUrl } from '@/lib/safe-url';

export const LIVE_REGIONS = ['US', 'GB', 'CA', 'AU'] as const;
export type LiveRegion = (typeof LIVE_REGIONS)[number];

const KEY = 'live-events:v1';
const LOCK = 'live-events:lock';
/** One refresh of all 4 countries. About 100 Watchmode credits. */
const TTL_SECONDS = 60 * 60 * 24;

export type LiveLink = {
  name: string;
  url: string;
  subscription: boolean | null;
};

export type LiveEvent = {
  id: number;
  name: string;
  league: string;
  start: string;
  status: string;
  links: LiveLink[];
};

type Bundle = {
  at: number;
  regions: Partial<Record<LiveRegion, LiveEvent[]>>;
};

let memory: Bundle | null = null;

export function isLiveRegion(region: string): region is LiveRegion {
  return (LIVE_REGIONS as readonly string[]).includes(region);
}

function pickLinks(row: Record<string, unknown>): LiveLink[] {
  const buckets = [
    ...(Array.isArray(row.sources) ? row.sources : []),
    ...(Array.isArray(row.event_destinations) ? row.event_destinations : []),
  ] as Record<string, unknown>[];
  const seen = new Set<string>();
  const links: LiveLink[] = [];
  for (const source of buckets) {
    const list = Array.isArray(source.links) ? (source.links as Record<string, unknown>[]) : [];
    const web =
      list.find((l) => l.platform === 'web' && typeof l.url === 'string') ||
      list.find((l) => typeof l.url === 'string');
    const url = typeof web?.url === 'string' ? web.url : '';
    if (!url || !isSafeHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);
    const name = String(source.provider_name || source.name || source.network_name || 'Watch');
    links.push({
      name,
      url,
      subscription: typeof web?.requires_subscription === 'boolean' ? web.requires_subscription : null,
    });
    if (links.length >= 4) break;
  }
  return links;
}

function mapEvent(row: Record<string, unknown>): LiveEvent | null {
  const id = Number(row.id);
  const name = String(row.name || row.title || '').trim();
  if (!id || !name) return null;
  const leagueObj = row.league && typeof row.league === 'object' ? (row.league as Record<string, unknown>) : null;
  return {
    id,
    name,
    league: String(leagueObj?.name || row.league_name || ''),
    start: String(row.start_time || ''),
    status: String(row.status || 'scheduled'),
    links: pickLinks(row),
  };
}

async function fetchRegion(region: LiveRegion, apiKey: string): Promise<LiveEvent[]> {
  const url =
    `https://api.watchmode.com/v1/live-events/?apiKey=${apiKey}` +
    `&region=${region}&include_sources=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error('live events', region, res.status);
    return [];
  }
  const data = await res.json();
  const rows = Array.isArray(data.events) ? data.events : Array.isArray(data) ? data : [];
  return rows
    .slice(0, 25)
    .map((row: Record<string, unknown>) => mapEvent(row))
    .filter((row: LiveEvent | null): row is LiveEvent => Boolean(row));
}

async function refreshAll(apiKey: string): Promise<Bundle> {
  const regions: Partial<Record<LiveRegion, LiveEvent[]>> = {};
  for (const region of LIVE_REGIONS) {
    regions[region] = await fetchRegion(region, apiKey);
  }
  const bundle: Bundle = { at: Date.now(), regions };
  memory = bundle;
  try {
    await kv.set(KEY, bundle, { ex: TTL_SECONDS });
  } catch (err) {
    console.error('live events cache write failed', err);
  }
  return bundle;
}

export async function liveEventsFor(region: LiveRegion): Promise<{ events: LiveEvent[]; cached: boolean }> {
  if (memory && Date.now() - memory.at < TTL_SECONDS * 1000 && memory.regions[region]) {
    return { events: memory.regions[region] || [], cached: true };
  }
  try {
    const saved = await kv.get<Bundle>(KEY);
    if (saved?.at && Date.now() - saved.at < TTL_SECONDS * 1000) {
      memory = saved;
      return { events: saved.regions[region] || [], cached: true };
    }
  } catch (err) {
    console.error('live events cache read failed', err);
    if (memory?.regions[region]) return { events: memory.regions[region] || [], cached: true };
    return { events: [], cached: true };
  }

  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) return { events: [], cached: true };

  let locked = false;
  try {
    const got = await kv.set(LOCK, '1', { nx: true, ex: 120 });
    locked = Boolean(got);
  } catch {
    locked = true;
  }
  if (!locked) {
    return { events: memory?.regions[region] || [], cached: true };
  }
  const bundle = await refreshAll(apiKey);
  return { events: bundle.regions[region] || [], cached: false };
}
