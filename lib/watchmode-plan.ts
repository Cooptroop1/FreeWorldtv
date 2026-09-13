import { ALLOWED_REGIONS, STARTUP_REGIONS } from '@/lib/regions';

/**
 * Flip this in Vercel when you upgrade Watchmode:
 *   WATCHMODE_PLAN=startup
 * Optional client copy:
 *   NEXT_PUBLIC_WATCHMODE_PLAN=startup
 * Until then every premium endpoint is a no-op (0 extra Watchmode credits).
 */
export type WatchmodePlan = 'free' | 'startup';

export function watchmodePlan(): WatchmodePlan {
  const raw = (
    process.env.WATCHMODE_PLAN ||
    process.env.NEXT_PUBLIC_WATCHMODE_PLAN ||
    'free'
  ).toLowerCase();
  return raw === 'startup' || raw === 'paid' || raw === 'business' ? 'startup' : 'free';
}

export function isPremiumPlan() {
  return watchmodePlan() === 'startup';
}

export function activeRegions(): readonly string[] {
  return isPremiumPlan() ? STARTUP_REGIONS : ALLOWED_REGIONS;
}

export const PLAN_FEATURES = {
  free: {
    credits: 2500,
    countries: 7,
    changesApi: false,
    episodeLinks: false,
    deeplinks: false,
    upcomingReleases: false,
    commercial: false,
  },
  startup: {
    credits: 40000,
    countries: 50,
    changesApi: true,
    episodeLinks: true,
    deeplinks: true,
    upcomingReleases: true,
    commercial: true,
  },
} as const;

export function planFeatures() {
  const plan = watchmodePlan();
  return { plan, regions: activeRegions(), ...PLAN_FEATURES[plan] };
}
