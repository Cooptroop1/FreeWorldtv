import { kv } from '@vercel/kv';

export const PREFS_TTL = 60 * 60 * 24 * 365;

export type LibraryStatus = 'want' | 'watched' | 'hidden';

export type LibraryItem = {
  id: number;
  title: string;
  year?: number;
  type?: string;
  poster?: string | null;
  poster_path?: string;
  tmdb_id?: number;
  status: LibraryStatus;
  addedAt: string;
};

export type AlertItem = {
  id: string;
  titleId: number;
  title: string;
  year?: number;
  region: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type ServiceOption = {
  id: string;
  label: string;
  names: string[];
};

export const SERVICE_OPTIONS: ServiceOption[] = [
  { id: 'bbc-iplayer', label: 'BBC iPlayer', names: ['BBC iPlayer', 'BBC', 'iPlayer'] },
  { id: 'itvx', label: 'ITVX', names: ['ITVX', 'ITV Player', 'ITV'] },
  { id: 'channel4', label: 'Channel 4', names: ['Channel 4', 'All 4', 'All4'] },
  { id: 'my5', label: 'My5', names: ['My5'] },
  { id: 'uktv', label: 'UKTV Play', names: ['UKTV Play', 'UKTV'] },
  { id: 'pluto', label: 'Pluto TV', names: ['Pluto TV', 'Pluto'] },
  { id: 'tubi', label: 'Tubi', names: ['Tubi', 'Tubi TV'] },
  { id: 'plex', label: 'Plex', names: ['Plex'] },
  { id: 'freevee', label: 'Freevee', names: ['Freevee', 'Amazon Freevee'] },
  { id: 'youtube', label: 'YouTube', names: ['YouTube'] },
  { id: 'roku', label: 'Roku Channel', names: ['Roku Channel', 'The Roku Channel'] },
  { id: 'netflix', label: 'Netflix', names: ['Netflix'] },
  { id: 'disney', label: 'Disney+', names: ['Disney+', 'Disney Plus'] },
  { id: 'prime', label: 'Prime Video', names: ['Prime Video', 'Amazon Prime Video'] },
  { id: 'max', label: 'Max', names: ['Max', 'MAX Free', 'HBO'] },
  { id: 'appletv', label: 'Apple TV', names: ['Apple TV', 'Apple TV+'] },
  { id: 'hulu', label: 'Hulu', names: ['Hulu'] },
  { id: 'paramount', label: 'Paramount+', names: ['Paramount+'] },
  { id: 'crunchyroll', label: 'Crunchyroll', names: ['Crunchyroll'] },
  { id: 'pbs', label: 'PBS', names: ['PBS'] },
  { id: 'cbc', label: 'CBC Gem', names: ['CBC Gem'] },
  { id: '7plus', label: '7plus', names: ['7plus'] },
  { id: '9now', label: '9Now', names: ['9Now'] },
  { id: 'peacock', label: 'Peacock', names: ['Peacock'] },
  { id: 'kanopy', label: 'Kanopy', names: ['Kanopy'] },
  { id: 'hoopla', label: 'Hoopla', names: ['Hoopla'] },
];

export function slimTitle(title: Record<string, unknown>, status: LibraryStatus): LibraryItem {
  return {
    id: Number(title.id),
    title: String(title.title || title.name || 'Untitled'),
    year: title.year ? Number(title.year) : undefined,
    type: title.type ? String(title.type) : undefined,
    poster: (title.poster as string | null) || null,
    poster_path: title.poster_path ? String(title.poster_path) : undefined,
    tmdb_id: title.tmdb_id ? Number(title.tmdb_id) : undefined,
    status,
    addedAt: new Date().toISOString(),
  };
}

export function sourceMatchesServices(sourceName: string, serviceIds: string[]): boolean {
  if (!sourceName || !serviceIds.length) return false;
  const n = sourceName.toLowerCase();
  return SERVICE_OPTIONS.filter((s) => serviceIds.includes(s.id)).some((s) =>
    s.names.some((name) => n.includes(name.toLowerCase()))
  );
}

export function sortByMyServices<T extends { name?: string }>(sources: T[], serviceIds: string[]): T[] {
  if (!serviceIds.length) return sources;
  return [...sources].sort((a, b) => {
    const aHit = sourceMatchesServices(a.name || '', serviceIds) ? 0 : 1;
    const bHit = sourceMatchesServices(b.name || '', serviceIds) ? 0 : 1;
    return aHit - bHit;
  });
}

export async function rememberAccountUser(userId: string, email?: string | null, region?: string) {
  await kv.sadd('library_users', userId);
  const key = `prefs:${userId}`;
  const prev = ((await kv.get(key)) || {}) as { email?: string; region?: string };
  const next = {
    email: email || prev.email || '',
    region: region || prev.region || 'GB',
  };
  await kv.set(key, next, { ex: PREFS_TTL });
}

export function listedKey(region: string) {
  return `free_listed:${region}`;
}

export function previousListedKey(region: string) {
  return `previous_free_listed:${region}`;
}
