import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type') || 'free';   // free or paid
  const search = searchParams.get('search')?.toLowerCase().trim() || '';

  if (secret !== process.env.REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const catalogKey = type === 'paid' ? 'full_premium_catalog' : 'full_free_catalog';
  const raw = await kv.get(catalogKey);
  const catalog: any[] = Array.isArray(raw) ? raw : [];

  let matches = catalog;
  if (search) {
    matches = catalog.filter((t: any) => 
      t.title && t.title.toLowerCase().includes(search)
    );
  }

  const results = matches.slice(0, 30).map((t: any) => ({
    id: t.id,
    title: t.title,
    year: t.year || '',
    clearLink: `https://freestreamworld.com/api/sources-debug?id=${t.id}&secret=${secret}&clear=true`
  }));

  return NextResponse.json({
    success: true,
    searched: search || '(all)',
    type: type,
    totalFound: matches.length,
    shown: results.length,
    results: results,
    message: `Found ${matches.length} titles. Click any "clearLink" to fix that title instantly.`
  });
}
