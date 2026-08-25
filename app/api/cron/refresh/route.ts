import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { adminToken, isAdminRequest } from '@/lib/admin-auth';
import { catalogKey } from '@/lib/regions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_REGIONS = ['GB', 'US'] as const;

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

  const sizes = await Promise.all(CRON_REGIONS.map(async (region) => ({
    region,
    size: await catalogSize(region),
  })));

  const jobs = sizes.map(({ region, size }) => ({
    region,
    mode: size < 100 ? 'full' : 'daily',
    size,
  }));

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

  const needsFull = jobs.some((j) => j.mode === 'full');
  const results = [];
  if (needsFull) {
    for (const job of jobs) {
      results.push(await run(job.region, job.mode));
    }
  } else {
    results.push(...(await Promise.all(jobs.map((job) => run(job.region, job.mode)))));
  }

  return NextResponse.json({ success: true, jobs, results });
}
