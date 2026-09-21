/** Watchmode quota resets on the 23rd. Fresh source-link cache from the 24th UTC. */
export const CYCLE_DAY = 24;

export function watchmodeCycleId(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = d >= CYCLE_DAY
    ? new Date(Date.UTC(y, m, CYCLE_DAY))
    : new Date(Date.UTC(y, m - 1, CYCLE_DAY));
  return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Seconds until 04:00 UTC on the next 24th (min 1 hour). */
export function secondsUntilNextCycle(now = new Date()): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const h = now.getUTCHours();
  let next: Date;
  if (d < CYCLE_DAY || (d === CYCLE_DAY && h < 4)) {
    next = new Date(Date.UTC(y, m, CYCLE_DAY, 4, 0, 0));
  } else {
    next = new Date(Date.UTC(y, m + 1, CYCLE_DAY, 4, 0, 0));
  }
  return Math.max(3600, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

export function sourcesKey(titleId: string | number, region: string, now = new Date()) {
  return `sources:${titleId}:${region}:${watchmodeCycleId(now)}`;
}

export function sourcesAtKey(titleId: string | number, region: string, now = new Date()) {
  return `sources_at:${titleId}:${region}:${watchmodeCycleId(now)}`;
}
