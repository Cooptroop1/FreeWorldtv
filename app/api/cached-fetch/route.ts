import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'FreeStreamWorld2026';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const region = (searchParams.get('region') || 'US').toUpperCase();
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Load the big snapshot (your 24h full_free_catalog)
  let fullCatalog: any[] = [];
  try {
    fullCatalog = (await kv.get('full_free_catalog')) || [];
  } catch (e) {
    console.error('Snapshot read failed:', e);
  }

  // === SEARCH MODE — 100% snapshot only (no API calls ever) ===
  if (query && fullCatalog.length > 0) {
    const searchTerm = query.toLowerCase();
    const filtered = fullCatalog.filter((t: any) =>
      t.title && t.title.toLowerCase().includes(searchTerm)
    );

    const start = (page - 1) * 48;
    const paged = filtered.slice(start, start + 48);

    return NextResponse.json({
      success: true,
      titles: paged,
      region,
      totalPages: Math.ceil(filtered.length / 48),
      catalogSize: fullCatalog.length,   // ← debug info
      message: `Snapshot search for "${query}" (${fullCatalog.length} total titles)`
    });
  }

  // === NORMAL DISCOVER MODE (no search) — snapshot paging ===
  if (!query && fullCatalog.length > 0) {
    const start = (page - 1) * 48;
    const pagedTitles = fullCatalog.slice(start, start + 48);
    return NextResponse.json({
      success: true,
      titles: pagedTitles,
      region,
      totalPages: Math.ceil(fullCatalog.length / 48),
      catalogSize: fullCatalog.length,
      message: 'Loaded from full catalog snapshot'
    });
  }

  // Empty snapshot fallback (very rare)
  return NextResponse.json({
    success: true,
    titles: [],
    catalogSize: 0,
    message: 'Catalog is empty — refresh needed'
  });
}
