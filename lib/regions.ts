export const ALLOWED_REGIONS = ['US', 'GB', 'CA', 'AU', 'IN', 'ES', 'BR'] as const;
export type Region = (typeof ALLOWED_REGIONS)[number];

export function isAllowedRegion(value: string): value is Region {
  return (ALLOWED_REGIONS as readonly string[]).includes(value);
}

export function catalogKey(paid: boolean, region: string) {
  return paid ? `premium_catalog:${region}` : `free_catalog:${region}`;
}

export function previousCatalogKey(region: string) {
  return `previous_free_catalog:${region}`;
}

export function catalogCursorKey(paid: boolean, region: string) {
  return `catalog_cursor:${paid ? 'premium' : 'free'}:${region}`;
}

export const CACHE_TTL_SECONDS = 86400 * 30;
/** Discover wall target per country. Watchmode list-titles is 250 per page. */
export const CATALOG_TARGET = 20000;
export const LIST_PAGE_SIZE = 250;
export const FULL_FREE_PAGES = 80;
export const EXPAND_PAGES = 10;
export const SEED_PAGES = 4;
