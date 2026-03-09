import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();
    const paid = searchParams.get('paid') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);

    // FREE (Discover + Search)
    if (!paid) {
      const raw = await kv.get('full_free_catalog');
      const catalog: any[] = Array.isArray(raw) ? raw : [];
      
      if (query) {
        const filtered = catalog.filter((t: any) =>
          t && t.title && typeof t.title === 'string' && 
          t.title.toLowerCase().includes(query.toLowerCase())
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

    // PREMIUM (cached)
    const rawPremium = await kv.get('full_premium_catalog');
    const catalogPremium: any[] = Array.isArray(rawPremium) ? rawPremium : [];
    const start = (page - 1) * 48;
    return NextResponse.json({
      success: true,
      titles: catalogPremium.slice(start, start + 48)
    });
  } catch (error) {
    console.error('cached-fetch error:', error);
    // Fallback for Vercel crawler so preview screenshot always works
    return NextResponse.json({ success: true, titles: [] });
  }
}
