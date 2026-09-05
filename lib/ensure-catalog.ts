import { kv } from '@vercel/kv';
import { CACHE_TTL_SECONDS, catalogKey } from '@/lib/regions';
import { fetchWatchmodePages, type CatalogTitle } from '@/lib/watchmode-list';

const SEED_PAGES = 3;
const LOCK_TTL_SEC = 90;

function lockKey(paid: boolean, region: string) {
  return `catalog_lock:${paid ? 'premium' : 'free'}:${region}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readCatalog(paid: boolean, region: string): Promise<CatalogTitle[]> {
  const raw = await kv.get(catalogKey(paid, region));
  return Array.isArray(raw) ? (raw as CatalogTitle[]) : [];
}

/** Wait for another request that is already calling Watchmode. */
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
    });

    if (result.titles.length > 0) {
      await kv.set(catalogKey(paid, region), result.titles, {
        ex: CACHE_TTL_SECONDS,
      });
      console.log('Seeded catalog', {
        region,
        paid,
        count: result.titles.length,
        pages: result.pages,
      });
      return {
        catalog: result.titles,
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
