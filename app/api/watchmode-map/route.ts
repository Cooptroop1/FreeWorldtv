import { getWatchmodeId } from '@/lib/watchmode-map';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get('tmdb_id');
  const parsed = tmdbId ? parseInt(tmdbId, 10) : NaN;
  const typeRaw = (request.nextUrl.searchParams.get('type') || '').toLowerCase();
  const type = typeRaw === 'tv' || typeRaw === 'tv_series' ? 'tv' : typeRaw === 'movie' ? 'movie' : undefined;

  if (!parsed || parsed < 1) {
    return NextResponse.json({ error: 'Missing or invalid tmdb_id' }, { status: 400 });
  }

  const watchmodeId = await getWatchmodeId(parsed, type);
  if (!watchmodeId) {
    return NextResponse.json({ error: 'No Watchmode ID found for this TMDB ID' }, { status: 404 });
  }

  return NextResponse.json({ watchmodeId });
}
