import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_REGIONS = ['GB', 'US'];

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = 'https://freestreamworld.com';
  const token = process.env.REFRESH_SECRET || '';
  const results = [];

  for (const region of CRON_REGIONS) {
    try {
      const res = await fetch(
        `${origin}/api/refresh-all-free?mode=daily&region=${region}`,
        {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      results.push({ region, ok: res.ok, json });
    } catch (err) {
      results.push({ region, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ success: true, results });
}
