import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const paid = searchParams.get('paid') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // FREE (Discover + Search) - uses snapshot
  if (!paid) {
    const catalog = await kv.get('full_free_catalog') || [];
    if (query) {
      const filtered = catalog.filter((t: any) =>
        t.title?.toLowerCase().includes(query.toLowerCase())
      );
      return NextResponse.json({
        success: true,
        titles: filtered.slice((page - 1) * 48, page * 48)
      });
    }
    const start = (page - 1) * 48;
    return NextResponse.json({
      success: true,
      titles: catalog.slice(start, start + 48)
    });
  }

  // PREMIUM (now also cached!)
  const catalog = await kv.get('full_premium_catalog') || [];
  const start = (page - 1) * 48;
  return NextResponse.json({
    success: true,
    titles: catalog.slice(start, start + 48)
  });
}
