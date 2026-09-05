import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { adminToken, isAdminRequest } from '@/lib/admin-auth';
import { ALLOWED_REGIONS, catalogKey } from '@/lib/regions';

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
    }))
  );

  const empty = sizes.filter((s) => s.size < 100).map((s) => s.region);
  const dayIndex = Math.floor(Date.now() / 86400000);
  const rotate = ALLOWED_REGIONS[dayIndex % ALLOWED_REGIONS.length];

  const jobs: { region: string; mode: 'full' | 'daily'; size: number }[] = [];
  const add = (region: string, mode: 'full' | 'daily') => {
    if (jobs.some((j) => j.region === region)) return;
    const size = sizes.find((s) => s.region === region)?.size || 0;
    jobs.push({ region, mode, size });
  };

  for (const region of empty) add(region, 'full');
  add('GB', (sizes.find((s) => s.region === 'GB')?.size || 0) < 100 ? 'full' : 'daily');
  add('US', (sizes.find((s) => s.region === 'US')?.size || 0) < 100 ? 'full' : 'daily');
  add(rotate, (sizes.find((s) => s.region === rotate)?.size || 0) < 100 ? 'full' : 'daily');

  const capped = jobs.some((j) => j.mode === 'full') ? jobs.slice(0, 2) : jobs.slice(0, 3);

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

  return NextResponse.json({ success: true, jobs: capped, skipped: jobs.slice(capped.length), results });
}
