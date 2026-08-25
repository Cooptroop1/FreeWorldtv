import { NextResponse } from 'next/server';
import { adminToken, isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_REGIONS = ['GB', 'US'];

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const token = adminToken();

  const results = await Promise.all(
    CRON_REGIONS.map(async (region) => {
      try {
        const res = await fetch(
          `${origin}/api/refresh-all-free?mode=daily&region=${region}`,
          {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const json = await res.json();
        return { region, ok: res.ok, json };
      } catch (err) {
        return { region, ok: false, error: String(err) };
      }
    })
  );

  return NextResponse.json({ success: true, results });
}
