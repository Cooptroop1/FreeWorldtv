import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const secret = searchParams.get('secret');
  const clear = searchParams.get('clear');

  if (secret !== process.env.REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // === CLEAR ALL CACHES ===
  if (clear === 'all') {
    const keys = await kv.keys('sources:*');
    let count = 0;
    for (const key of keys) {
      await kv.del(key);
      count++;
    }
    return NextResponse.json({
      success: true,
      clearedAll: true,
      itemsCleared: count,
      message: `✅ Cleared ${count} video link caches. Click any title again — fresh links will load.`
    });
  }

  // === SINGLE TITLE (original mode) ===
  if (!id) {
    return NextResponse.json({ error: 'Missing id or use ?clear=all' }, { status: 400 });
  }

  const key = `sources:${id}:US`;

  if (clear === 'true') {
    await kv.del(key);
    return NextResponse.json({ 
      success: true, 
      message: `Cache cleared for title ${id}. Click it again on the site.` 
    });
  }

  const cached = await kv.get<any[]>(key) || [];
  return NextResponse.json({
    success: true,
    titleId: id,
    cachedSourcesCount: cached.length,
    isEmpty: cached.length === 0,
    message: cached.length > 0 ? `${cached.length} sources cached` : 'No sources cached'
  });
}
