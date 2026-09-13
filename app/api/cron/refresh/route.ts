import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { adminToken, isAdminRequest } from '@/lib/admin-auth';
import { ALLOWED_REGIONS, CATALOG_TARGET, catalogExhaustedKey, catalogKey } from '@/lib/regions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function catalogSize(region: string) {
  const catalog = (await kv.get<unknown[]>(catalogKey(false, region))) || [];
  return Array.isArray(catalog) ? catalog.length : 0;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const token = adminToken();

  const sizes = await Promise.all(
    ALLOWED_REGIONS.map(async (region) => ({
      region,
      size: await catalogSize(region),
      exhausted: Boolean(await kv.get(catalogExhaustedKey(false, region))),
    }))
  );

  const undersized = sizes
    .filter((s) => s.size < CATALOG_TARGET && !s.exhausted)
    .sort((a, b) => a.size - b.size);

  const jobs: { region: string; mode: 'expand' | 'daily'; size: number }[] = [];
  const add = (region: string, mode: 'expand' | 'daily') => {
    if (jobs.some((j) => j.region === region)) return;
    const size = sizes.find((s) => s.region === region)?.size || 0;
    jobs.push({ region, mode, size });
  };

  for (const row of undersized) add(row.region, 'expand');
  if (!undersized.length) {
    add('GB', 'daily');
    add('US', 'daily');
  }

  const capped = jobs.slice(0, 3);

  const run = async (region: string, mode: string) => {
    try {
      const res = await fetch(
        `${origin}/api/refresh-all-free?mode=${mode}&region=${region}`,
        {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      return { region, mode, ok: res.ok, json };
    } catch (err) {
      return { region, mode, ok: false, error: String(err) };
    }
  };

  const results = [];
  for (const job of capped) {
    results.push(await run(job.region, job.mode));
  }

  return NextResponse.json({
    success: true,
    target: CATALOG_TARGET,
    sizes,
    jobs: capped,
    skipped: jobs.slice(capped.length),
    results,
  });
}
