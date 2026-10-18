import { NextResponse } from 'next/server';
import { activeRegions } from '@/lib/watchmode-plan';

export const dynamic = 'force-dynamic';

// Watchmode name search, cached by Vercel. Does not download the country list.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim().slice(0, 80);
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();

  if (!query) {
    return NextResponse.json({ success: false, error: 'Missing search query' }, { status: 400 });
  }
  if (!activeRegions().includes(regionRaw)) {
    return NextResponse.json({ success: false, error: 'Unsupported region' }, { status: 400 });
  }

  const apiKey = process.env.WATCHMODE_API_KEY || '';
  if (!apiKey) {
    return NextResponse.json({ success: true, titles: [], totalResults: 0 });
  }

  try {
    const url =
      `https://api.watchmode.com/v1/search/?apiKey=${apiKey}` +
      `&search_field=name&search_value=${encodeURIComponent(query)}&types=movie,tv_series`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 12 } });
    if (!res.ok) {
      return NextResponse.json({ success: true, titles: [], totalResults: 0 });
    }
    const data = await res.json();
    const raw = Array.isArray(data.title_results) ? data.title_results : [];
    const titles = raw.slice(0, 40).map((t: Record<string, unknown>) => ({
      id: Number(t.id),
      title: String(t.name || t.title || 'Untitled'),
      year: t.year ? Number(t.year) : undefined,
      type: t.type ? String(t.type) : undefined,
      tmdb_id: t.tmdb_id ? Number(t.tmdb_id) : undefined,
      poster: (t.poster as string | null) || null,
    })).filter((t: { id: number }) => t.id);

    return NextResponse.json({
      success: true,
      titles,
      totalResults: titles.length,
      message: `Found ${titles.length} matches for "${query}"`,
    });
  } catch (err) {
    console.error('search failed', err);
    return NextResponse.json({ success: true, titles: [], totalResults: 0 });
  }
}
