/** Grandfathered free-tier countries (this account). */
export const ALLOWED_REGIONS = ['US', 'GB', 'CA', 'AU', 'IN', 'ES', 'BR'] as const;
export type Region = (typeof ALLOWED_REGIONS)[number];

/** Extra countries Watchmode Startup unlocks. First visitor still seeds KV. */
export const STARTUP_REGIONS = [
  'US', 'GB', 'CA', 'AU', 'IN', 'ES', 'BR',
  'DE', 'FR', 'IT', 'NL', 'IE', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL', 'AT', 'BE', 'CH',
  'MX', 'AR', 'CL', 'CO', 'JP', 'KR', 'NZ', 'ZA', 'AE', 'SG', 'HK', 'TW', 'PH', 'ID', 'TH', 'TR',
] as const;

export const REGION_LABELS: Record<string, string> = {
  US: '🇺🇸 United States',
  GB: '🇬🇧 United Kingdom',
  CA: '🇨🇦 Canada',
  AU: '🇦🇺 Australia',
  IN: '🇮🇳 India',
  ES: '🇪🇸 Spain',
  BR: '🇧🇷 Brazil',
  DE: '🇩🇪 Germany',
  FR: '🇫🇷 France',
  IT: '🇮🇹 Italy',
  NL: '🇳🇱 Netherlands',
  IE: '🇮🇪 Ireland',
  PT: '🇵🇹 Portugal',
  SE: '🇸🇪 Sweden',
  NO: '🇳🇴 Norway',
  DK: '🇩🇰 Denmark',
  FI: '🇫🇮 Finland',
  PL: '🇵🇱 Poland',
  AT: '🇦🇹 Austria',
  BE: '🇧🇪 Belgium',
  CH: '🇨🇭 Switzerland',
  MX: '🇲🇽 Mexico',
  AR: '🇦🇷 Argentina',
  CL: '🇨🇱 Chile',
  CO: '🇨🇴 Colombia',
  JP: '🇯🇵 Japan',
  KR: '🇰🇷 South Korea',
  NZ: '🇳🇿 New Zealand',
  ZA: '🇿🇦 South Africa',
  AE: '🇦🇪 UAE',
  SG: '🇸🇬 Singapore',
  HK: '🇭🇰 Hong Kong',
  TW: '🇹🇼 Taiwan',
  PH: '🇵🇭 Philippines',
  ID: '🇮🇩 Indonesia',
  TH: '🇹🇭 Thailand',
  TR: '🇹🇷 Turkey',
};

export function isAllowedRegion(value: string): boolean {
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

export function catalogExhaustedKey(paid: boolean, region: string) {
  return `catalog_exhausted:${paid ? 'premium' : 'free'}:${region}`;
}

export const CACHE_TTL_SECONDS = 86400 * 30;
/** Discover wall target per country. Watchmode list-titles is 250 per page. */
export const CATALOG_TARGET = 20000;
export const LIST_PAGE_SIZE = 250;
export const FULL_FREE_PAGES = 80;
export const EXPAND_PAGES = 10;
export const SEED_PAGES = 4;
