// app/api/watchmode-map/route.ts
import { getWatchmodeId } from '@/lib/watchmode-map';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get('tmdb_id');

  if (!tmdbId) {
    return Response.json({ error: 'Missing tmdb_id parameter' }, { status: 400 });
  }

  const watchmodeId = await getWatchmodeId(parseInt(tmdbId, 10));

  if (!watchmodeId) {
    return Response.json({ error: 'No Watchmode ID found for this TMDB ID' }, { status: 404 });
  }

  return Response.json({ watchmodeId });
}
