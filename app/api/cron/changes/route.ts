import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { isAdminRequest } from '@/lib/admin-auth';
import { isPremiumPlan } from '@/lib/watchmode-plan';
import { ALLOWED_REGIONS } from '@/lib/regions';
import { sourcesKey } from '@/lib/watchmode-cycle';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Startup-only. Uses Watchmode Changes API to drop stale source caches
 * so the next visitor gets fresh "where to watch" without rebuilding 20k walls.
 * No-op on the free plan (0 credits).
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPremiumPlan()) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'WATCHMODE_PLAN is not startup — Changes API is paid-only',
    });
  }

  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'WATCHMODE_API_KEY missing' }, { status: 500 });
  }

  const end = new Date();
  const start = new Date(Date.now() - 2 * 86400000);
  const startDate = yyyymmdd(start);
  const endDate = yyyymmdd(end);
  const calls: { url: string; ok: boolean; count?: number; error?: string }[] = [];
  let invalidated = 0;

  const hit = async (path: string, extra = '') => {
    const url = `https://api.watchmode.com/v1/${path}?apiKey=${apiKey}&start_date=${startDate}&end_date=${endDate}${extra}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        calls.push({ url: path, ok: false, error: `HTTP ${res.status}` });
        return [] as number[];
      }
      const data = await res.json();
      const ids: number[] = Array.isArray(data.titles)
        ? data.titles.map((t: unknown) => Number(t)).filter(Boolean)
        : [];
      calls.push({ url: path, ok: true, count: ids.length });
      return ids;
    } catch (err) {
      calls.push({ url: path, ok: false, error: String(err) });
      return [] as number[];
    }
  };

  await hit('changes/new_titles/', '&types=movie,tv_series');
  await hit('changes/titles_details_changed/');

  for (const region of ALLOWED_REGIONS) {
    const ids = await hit('changes/titles_sources_changed/', `&regions=${region}`);
    for (const id of ids.slice(0, 400)) {
      await kv.del(sourcesKey(id, region));
      invalidated += 1;
    }
  }

  await kv.set('lastChangesSync', Date.now());

  return NextResponse.json({
    success: true,
    skipped: false,
    startDate,
    endDate,
    invalidated,
    calls,
  });
}
