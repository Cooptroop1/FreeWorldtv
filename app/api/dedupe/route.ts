import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { ALLOWED_REGIONS, CACHE_TTL_SECONDS, catalogKey } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, { beforeFree: number; afterFree: number; beforePremium: number; afterPremium: number }> = {};

  for (const region of ALLOWED_REGIONS) {
    for (const paid of [false, true]) {
      const key = catalogKey(paid, region);
      const raw = await kv.get<{ id: number }[]>(key);
      const list = Array.isArray(raw) ? raw : [];
      const seen = new Set<number>();
      const clean = list.filter((t) => t?.id && !seen.has(t.id) && seen.add(t.id));
      if (clean.length !== list.length) {
        await kv.set(key, clean, { ex: CACHE_TTL_SECONDS });
      }
      if (!results[region]) {
        results[region] = { beforeFree: 0, afterFree: 0, beforePremium: 0, afterPremium: 0 };
      }
      if (paid) {
        results[region].beforePremium = list.length;
        results[region].afterPremium = clean.length;
      } else {
        results[region].beforeFree = list.length;
        results[region].afterFree = clean.length;
      }
    }
  }

  return NextResponse.json({ success: true, results });
}
