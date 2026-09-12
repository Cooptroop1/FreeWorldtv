import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  CACHE_TTL_SECONDS,
  CATALOG_TARGET,
  EXPAND_PAGES,
  FULL_FREE_PAGES,
  catalogKey,
  isAllowedRegion,
  previousCatalogKey,
} from '@/lib/regions';
import { listedKey, previousListedKey } from '@/lib/account';
import { fetchWatchmodePages, type CatalogTitle } from '@/lib/watchmode-list';
import { expandCatalog } from '@/lib/ensure-catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function writeIfFresh(
  key: string,
  incoming: CatalogTitle[],
  previousKey?: string
): Promise<{ wrote: boolean; stored: number; skipped?: string }> {
  if (!incoming.length) {
    const current = await kv.get(key);
    const n = Array.isArray(current) ? current.length : 0;
    return {
      wrote: false,
      stored: n,
      skipped: 'Watchmode returned 0 titles — kept existing catalogue',
    };
  }

  if (previousKey) {
    const old = await kv.get(key);
    if (Array.isArray(old) && old.length > 0) {
      await kv.set(previousKey, old, { ex: CACHE_TTL_SECONDS });
    }
    const capped = incoming.slice(0, CATALOG_TARGET);
    await kv.set(key, capped, { ex: CACHE_TTL_SECONDS });
    return { wrote: true, stored: capped.length };
  }

  const current: CatalogTitle[] = (await kv.get(key)) || [];
  const ids = new Set(incoming.map((t) => t.id));
  const merged = [...incoming, ...current.filter((t) => !ids.has(t.id))].slice(0, CATALOG_TARGET);
  await kv.set(key, merged, { ex: CACHE_TTL_SECONDS });
  return { wrote: true, stored: merged.length };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'expand';
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  if (!isAllowedRegion(regionRaw)) {
    return NextResponse.json({ error: 'Unsupported region' }, { status: 400 });
  }
  const region = regionRaw;

  if (mode === 'expand') {
    const freeExp = await expandCatalog(false, region, EXPAND_PAGES);
    const premiumExp = await expandCatalog(true, region, 2);
    return NextResponse.json({
      success: true,
      mode,
      region,
      freeTitles: freeExp.stored,
      premiumTitles: premiumExp.stored,
      added: { free: freeExp.added, premium: premiumExp.added },
      exhausted: freeExp.exhausted || false,
      target: CATALOG_TARGET,
      message: `Expanded ${region} toward ${CATALOG_TARGET} (free now ${freeExp.stored})`,
    });
  }

  const maxPages = mode === 'daily' ? 2 : FULL_FREE_PAGES;
  const premiumPages = mode === 'daily' ? 2 : 8;

  const free = await fetchWatchmodePages({ region, sourceType: 'free', maxPages, startPage: 1 });
  const premium = await fetchWatchmodePages({
    region,
    sourceType: 'sub',
    maxPages: premiumPages,
    startPage: 1,
  });

  if (free.titles.length > 0) {
    const oldListed = await kv.get(listedKey(region));
    if (Array.isArray(oldListed) && oldListed.length > 0) {
      await kv.set(previousListedKey(region), oldListed, { ex: CACHE_TTL_SECONDS });
    }
    await kv.set(listedKey(region), free.titles, { ex: CACHE_TTL_SECONDS });
  }

  const freeKey = catalogKey(false, region);
  const premiumKey = catalogKey(true, region);

  let freeWrite;
  let premiumWrite;
  if (mode === 'full') {
    freeWrite = await writeIfFresh(freeKey, free.titles, previousCatalogKey(region));
    premiumWrite = await writeIfFresh(premiumKey, premium.titles);
    await kv.set('lastFullRefresh', Date.now());
  } else {
    freeWrite = await writeIfFresh(freeKey, free.titles);
    premiumWrite = await writeIfFresh(premiumKey, premium.titles);
    await kv.set('lastDailyRefresh', Date.now());
  }

  return NextResponse.json({
    success: free.ok || freeWrite.stored > 0,
    mode,
    region,
    freeTitles: freeWrite.stored,
    premiumTitles: premiumWrite.stored,
    target: CATALOG_TARGET,
    watchmode: {
      freeOk: free.ok,
      freeFetched: free.titles.length,
      freeError: free.error || null,
      premiumOk: premium.ok,
      premiumFetched: premium.titles.length,
      premiumError: premium.error || null,
    },
    skipped: {
      free: freeWrite.skipped || null,
      premium: premiumWrite.skipped || null,
    },
    message: mode === 'full'
      ? `Replaced ${region} catalogs up to ${CATALOG_TARGET}`
      : `Smart daily merge for ${region}`,
  });
}
