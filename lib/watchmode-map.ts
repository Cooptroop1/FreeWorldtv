// Server-only Watchmode ID map. Do not import this from client components.
import { kv } from '@vercel/kv';

export { providerLogos } from './provider-logos';

const CHUNK_COUNT = 256;
const CHUNK_TTL = 86400 * 14;
const ID_TTL = 86400 * 30;
const MISS_TTL = 86400;
const CSV_URL = 'https://api.watchmode.com/datasets/title_id_map.csv';
const MAP_META_KEY = 'title_id_map:meta';

const memoryHits = new Map<number, number>();
const memoryMisses = new Set<number>();

function chunkKey(bucket: number) {
  return `title_id_map:${bucket}`;
}

function idKey(tmdbId: number) {
  return `wm:tmdb:${tmdbId}`;
}

function bucketFor(tmdbId: number) {
  return ((tmdbId % CHUNK_COUNT) + CHUNK_COUNT) % CHUNK_COUNT;
}

function parseCsvLine(line: string): { watchmodeId: number; tmdbId: number } | null {
  const match = line.match(/^"?(\d+)"?,"[^"]*","?(\d+)"?/);
  if (!match) return null;
  const watchmodeId = parseInt(match[1], 10);
  const tmdbId = parseInt(match[2], 10);
  if (!watchmodeId || !tmdbId) return null;
  return { watchmodeId, tmdbId };
}

async function remember(tmdbId: number, watchmodeId: number | null) {
  if (watchmodeId && watchmodeId > 0) {
    memoryHits.set(tmdbId, watchmodeId);
    memoryMisses.delete(tmdbId);
    await kv.set(idKey(tmdbId), watchmodeId, { ex: ID_TTL });
    return watchmodeId;
  }
  memoryMisses.add(tmdbId);
  await kv.set(idKey(tmdbId), 0, { ex: MISS_TTL });
  return null;
}

async function searchByTmdb(tmdbId: number, type?: 'movie' | 'tv'): Promise<number | null> {
  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) return null;

  const fields = type === 'tv'
    ? ['tmdb_tv_id']
    : type === 'movie'
      ? ['tmdb_movie_id']
      : ['tmdb_movie_id', 'tmdb_tv_id'];

  for (const field of fields) {
    const url =
      `https://api.watchmode.com/v1/search/?apiKey=${apiKey}` +
      `&search_field=${field}&search_value=${tmdbId}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const id = Number(json?.title_results?.[0]?.id);
      if (id > 0) return id;
    } catch (err) {
      console.error('Watchmode TMDB search failed', field, err);
    }
  }
  return null;
}

export async function getWatchmodeId(
  tmdbId: number,
  type?: 'movie' | 'tv'
): Promise<number | null> {
  if (!tmdbId || tmdbId < 1) return null;
  if (memoryHits.has(tmdbId)) return memoryHits.get(tmdbId) ?? null;
  if (memoryMisses.has(tmdbId)) return null;

  const direct = await kv.get<number>(idKey(tmdbId));
  if (typeof direct === 'number') {
    if (direct > 0) {
      memoryHits.set(tmdbId, direct);
      return direct;
    }
    memoryMisses.add(tmdbId);
    return null;
  }

  const chunk = await kv.get<Record<string, number>>(chunkKey(bucketFor(tmdbId)));
  if (chunk && typeof chunk === 'object') {
    const mapped = Number(chunk[String(tmdbId)]);
    if (mapped > 0) return remember(tmdbId, mapped);
    const ingested = await kv.get(MAP_META_KEY);
    if (ingested) return remember(tmdbId, null);
  }

  const found = await searchByTmdb(tmdbId, type);
  return remember(tmdbId, found);
}

export async function ingestTitleIdMap(): Promise<{
  success: boolean;
  rows: number;
  chunks: number;
  ms: number;
  error?: string;
}> {
  const started = Date.now();
  const chunks: Record<string, number>[] = Array.from({ length: CHUNK_COUNT }, () => ({}));
  let rows = 0;

  try {
    const res = await fetch(CSV_URL, { cache: 'no-store' });
    if (!res.ok || !res.body) {
      throw new Error(`CSV download failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let headerSkipped = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let newline = buf.indexOf('\n');
      while (newline >= 0) {
        const line = buf.slice(0, newline).replace(/\r$/, '');
        buf = buf.slice(newline + 1);
        newline = buf.indexOf('\n');
        if (!headerSkipped) {
          headerSkipped = true;
          continue;
        }
        const parsed = parseCsvLine(line);
        if (!parsed) continue;
        chunks[bucketFor(parsed.tmdbId)][String(parsed.tmdbId)] = parsed.watchmodeId;
        rows += 1;
      }
    }

    if (buf.trim()) {
      const parsed = parseCsvLine(buf.replace(/\r$/, ''));
      if (parsed) {
        chunks[bucketFor(parsed.tmdbId)][String(parsed.tmdbId)] = parsed.watchmodeId;
        rows += 1;
      }
    }

    if (rows < 1000) {
      throw new Error(`CSV parsed too few rows (${rows})`);
    }

    for (let i = 0; i < CHUNK_COUNT; i += 16) {
      const batch = [];
      for (let j = i; j < Math.min(CHUNK_COUNT, i + 16); j++) {
        batch.push(kv.set(chunkKey(j), chunks[j], { ex: CHUNK_TTL }));
      }
      await Promise.all(batch);
    }

    await kv.set(
      MAP_META_KEY,
      { ingestedAt: Date.now(), rows, chunks: CHUNK_COUNT },
      { ex: CHUNK_TTL }
    );

    return { success: true, rows, chunks: CHUNK_COUNT, ms: Date.now() - started };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed';
    console.error('title_id_map ingest failed', message);
    return { success: false, rows, chunks: 0, ms: Date.now() - started, error: message };
  }
}
