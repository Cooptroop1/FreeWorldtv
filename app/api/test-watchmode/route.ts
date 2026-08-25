import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.WATCHMODE_API_KEY || '';
  if (!key) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY is not set' }, { status: 500 });
  }

  const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${key}&source_types=free&regions=GB&types=movie,tv_series&sort_by=popularity_desc&page=1&limit=5`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json({
      status: res.status,
      apiKeyPresent: true,
      titleCount: data.titles?.length || 0,
      message: data.titles?.length ? 'Success' : 'Watchmode returned nothing',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
