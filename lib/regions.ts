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

export const CACHE_TTL_SECONDS = 86400 * 30;
