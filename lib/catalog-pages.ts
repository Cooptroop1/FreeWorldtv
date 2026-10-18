import { kv } from '@vercel/kv';
import { CACHE_TTL_SECONDS } from '@/lib/regions';
import type { CatalogTitle } from '@/lib/watchmode-list';
import { buildFranchiseSets } from '@/lib/franchises';

/** Same size Discover asks for. One Redis key = one screen of posters. */
export const CATALOG_PAGE_SIZE = 48;

/**
 * Set CATALOG_PAGE_READS=0 in Vercel to ignore the page keys and read the
 * full country list again. The full list is still written either way.
 */
export function catalogPageReadsEnabled() {
  return process.env.CATALOG_PAGE_READS !== '0';
}

export type CatalogPageMeta = { pages: number; count: number };

function kind(paid: boolean) {
  return paid ? 'premium' : 'free';
}

export function catalogPageKey(paid: boolean, region: string, page: number) {
  return `catpage:${kind(paid)}:${region}:${page}`;
}

export function catalogPageMetaKey(paid: boolean, region: string) {
  return `catmeta:${kind(paid)}:${region}`;
}

export async function writeCatalogPages(paid: boolean, region: string, titles: CatalogTitle[]) {
  const pageCount = Math.max(1, Math.ceil(titles.length / CATALOG_PAGE_SIZE) || 1);
  const metaKey = catalogPageMetaKey(paid, region);
  const prev = await kv.get<CatalogPageMeta>(metaKey);
  const prevPages = Number(prev?.pages) || 0;

  for (let i = 0; i < pageCount; i += 20) {
    const batch = [];
    for (let p = i; p < Math.min(pageCount, i + 20); p++) {
      const slice = titles.slice(p * CATALOG_PAGE_SIZE, (p + 1) * CATALOG_PAGE_SIZE);
      batch.push(
        kv.set(catalogPageKey(paid, region, p + 1), slice, { ex: CACHE_TTL_SECONDS })
      );
    }
    await Promise.all(batch);
  }

  if (prevPages > pageCount) {
    const dels = [];
    for (let p = pageCount + 1; p <= prevPages; p++) {
      dels.push(kv.del(catalogPageKey(paid, region, p)));
    }
    await Promise.all(dels);
  }

  const meta: CatalogPageMeta = { pages: pageCount, count: titles.length };
  await kv.set(metaKey, meta, { ex: CACHE_TTL_SECONDS });
  try {
    const sets = buildFranchiseSets(titles).slice(0, 24);
    await kv.set(`franchise_sets:${kind(paid)}:${region}`, sets, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.error('franchise cache write failed', err);
  }
}

export async function readCatalogPage(
  paid: boolean,
  region: string,
  page: number
): Promise<{ titles: CatalogTitle[]; count: number; pages: number } | null> {
  if (!catalogPageReadsEnabled()) return null;
  const meta = await kv.get<CatalogPageMeta>(catalogPageMetaKey(paid, region));
  if (!meta?.pages || !meta.count) return null;
  const safePage = Math.max(1, page);
  if (safePage > meta.pages) {
    return { titles: [], count: meta.count, pages: meta.pages };
  }
  const raw = await kv.get<CatalogTitle[]>(catalogPageKey(paid, region, safePage));
  if (!Array.isArray(raw)) return null;
  return { titles: raw, count: meta.count, pages: meta.pages };
}
