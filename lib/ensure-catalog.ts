import { kv } from '@vercel/kv';
import {
  CACHE_TTL_SECONDS,
  CATALOG_TARGET,
  EXPAND_PAGES,
  LIST_PAGE_SIZE,
  SEED_PAGES,
  catalogCursorKey,
  catalogExhaustedKey,
  catalogKey,
} from '@/lib/regions';
import { fetchWatchmodePages, type CatalogTitle } from '@/lib/watchmode-list';

const LOCK_TTL_SEC = 90;

function lockKey(paid: boolean, region: string) {
  return `catalog_lock:${paid ? 'premium' : 'free'}:${region}`;
}

function exhaustedKey(paid: boolean, region: string) {
  return catalogExhaustedKey(paid, region);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function readCatalog(paid: boolean, region: string): Promise<CatalogTitle[]> {
  const raw = await kv.get(catalogKey(paid, region));
  return Array.isArray(raw) ? (raw as CatalogTitle[]) : [];
}

async function waitForBuilder(paid: boolean, region: string): Promise<CatalogTitle[]> {
  for (let i = 0; i < 10; i++) {
    await sleep(800);
    const catalog = await readCatalog(paid, region);
    if (catalog.length) return catalog;
    const stillLocked = await kv.get(lockKey(paid, region));
    if (!stillLocked) {
      return readCatalog(paid, region);
    }
  }
  return readCatalog(paid, region);
}

async function mergeAndStore(
  paid: boolean,
  region: string,
  current: CatalogTitle[],
  incoming: CatalogTitle[],
  lastPage: number
) {
  const ids = new Set(current.map((t) => t.id));
  const merged = [...current];
  for (const title of incoming) {
    if (!ids.has(title.id)) {
      ids.add(title.id);
      merged.push(title);
    }
  }
  const stored = merged.slice(0, CATALOG_TARGET);
  await kv.set(catalogKey(paid, region), stored, { ex: CACHE_TTL_SECONDS });
  await kv.set(catalogCursorKey(paid, region), lastPage, { ex: CACHE_TTL_SECONDS });
  return stored;
}

/**
 * Serve KV if this country already has a catalogue.
 * If empty, the first visitor spends a few Watchmode calls and writes KV
 * so the next visitor (and everyone else) is cache-only.
 */
export async function loadOrSeedCatalog(
  paid: boolean,
  region: string
): Promise<{
  catalog: CatalogTitle[];
  fromCache: boolean;
  seeded: boolean;
  building: boolean;
  error?: string;
}> {
  const existing = await readCatalog(paid, region);
  if (existing.length > 0) {
    return { catalog: existing, fromCache: true, seeded: false, building: false };
  }

  if (await kv.get(lockKey(paid, region))) {
    const waited = await waitForBuilder(paid, region);
    if (waited.length) {
      return { catalog: waited, fromCache: true, seeded: false, building: false };
    }
  }

  const gotLock = await kv.set(lockKey(paid, region), Date.now(), {
    nx: true,
    ex: LOCK_TTL_SEC,
  });
  if (!gotLock) {
    const waited = await waitForBuilder(paid, region);
    return {
      catalog: waited,
      fromCache: true,
      seeded: false,
      building: waited.length === 0,
    };
  }

  try {
    const result = await fetchWatchmodePages({
      region,
      sourceType: paid ? 'sub' : 'free',
      maxPages: SEED_PAGES,
      startPage: 1,
    });

    if (result.titles.length > 0) {
      const stored = await mergeAndStore(paid, region, [], result.titles, result.lastPage);
      console.log('Seeded catalog', { region, paid, count: stored.length, pages: result.pages });
      return {
        catalog: stored,
        fromCache: false,
        seeded: true,
        building: false,
      };
    }

    return {
      catalog: [],
      fromCache: true,
      seeded: false,
      building: false,
      error: result.error || 'Watchmode returned no titles',
    };
  } finally {
    await kv.del(lockKey(paid, region));
  }
}

/** Append the next Watchmode pages until this country hits the 20k wall. */
export async function expandCatalog(
  paid: boolean,
  region: string,
  pages = EXPAND_PAGES
): Promise<{ stored: number; added: number; exhausted?: boolean; skipped?: string }> {
  const existing = await readCatalog(paid, region);
  if (existing.length >= CATALOG_TARGET) {
    return { stored: existing.length, added: 0, exhausted: true };
  }
  if (await kv.get(exhaustedKey(paid, region))) {
    return { stored: existing.length, added: 0, exhausted: true, skipped: 'watchmode empty' };
  }

  const gotLock = await kv.set(lockKey(paid, region), Date.now(), {
    nx: true,
    ex: LOCK_TTL_SEC,
  });
  if (!gotLock) {
    return { stored: existing.length, added: 0, skipped: 'locked' };
  }

  try {
    const storedCursor = Number(await kv.get(catalogCursorKey(paid, region))) || 0;
    const guessed = Math.max(1, Math.ceil(existing.length / LIST_PAGE_SIZE));
    let startPage = (storedCursor || guessed) + 1;

    let result = await fetchWatchmodePages({
      region,
      sourceType: paid ? 'sub' : 'free',
      maxPages: pages,
      startPage,
    });

    // Cursor was too far ahead (old 10k run). Rewind and try the next real page.
    if (result.ok && result.titles.length === 0 && startPage > guessed + 1) {
      startPage = guessed + 1;
      result = await fetchWatchmodePages({
        region,
        sourceType: paid ? 'sub' : 'free',
        maxPages: pages,
        startPage,
      });
    }

    if (result.ok && result.titles.length === 0) {
      await kv.set(exhaustedKey(paid, region), 1, { ex: CACHE_TTL_SECONDS });
      return { stored: existing.length, added: 0, exhausted: true };
    }

    if (!result.titles.length) {
      return { stored: existing.length, added: 0, skipped: result.error || 'no titles' };
    }

    await kv.del(exhaustedKey(paid, region));
    const stored = await mergeAndStore(paid, region, existing, result.titles, result.lastPage);
    if (result.exhausted) {
      await kv.set(exhaustedKey(paid, region), 1, { ex: CACHE_TTL_SECONDS });
    }
    console.log('Expanded catalog', {
      region,
      paid,
      added: stored.length - existing.length,
      stored: stored.length,
      lastPage: result.lastPage,
    });
    return {
      stored: stored.length,
      added: stored.length - existing.length,
      exhausted: result.exhausted || stored.length >= CATALOG_TARGET,
    };
  } finally {
    await kv.del(lockKey(paid, region));
  }
}
