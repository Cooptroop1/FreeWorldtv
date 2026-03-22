import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const secret = searchParams.get('secret');
  const clear = searchParams.get('clear') === 'true';

  if (secret !== process.env.REFRESH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const key = `sources:${id}:US`;

  if (clear) {
    await kv.del(key);
    return NextResponse.json({ 
      success: true, 
      message: `Cache cleared for title ${id}. Click the title again — it will now fetch fresh links.` 
    });
  }

  const cached = await kv.get<any[]>(key) || [];
  return NextResponse.json({
    success: true,
    titleId: id,
    cachedSourcesCount: cached.length,
    cachedSources: cached,
    isEmpty: cached.length === 0,
    message: cached.length > 0 ? `${cached.length} sources cached` : 'No sources cached (this is why it shows no links)'
  });
}
