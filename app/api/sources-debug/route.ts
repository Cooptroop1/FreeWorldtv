import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { isAllowedRegion } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const clear = searchParams.get('clear');
  const regionRaw = (searchParams.get('region') || 'US').toUpperCase();
  const region = isAllowedRegion(regionRaw) ? regionRaw : 'US';

  if (clear === 'all') {
    const keys = await kv.keys('sources:*');
    let count = 0;
    for (const key of keys) {
      await kv.del(key);
      count++;
    }
    return NextResponse.json({ success: true, clearedAll: true, itemsCleared: count });
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id or use ?clear=all' }, { status: 400 });
  }

  const key = `sources:${id}:${region}`;

  if (clear === 'true') {
    await kv.del(key);
    return NextResponse.json({ success: true, message: `Cache cleared for title ${id} (${region})` });
  }

  const cached = (await kv.get<unknown[]>(key)) || [];
  return NextResponse.json({
    success: true,
    titleId: id,
    region,
    cachedSourcesCount: Array.isArray(cached) ? cached.length : 0,
  });
}
