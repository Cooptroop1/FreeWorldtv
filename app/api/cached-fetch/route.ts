import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const region = searchParams.get('region') || 'US';
  const type = searchParams.get('type') || 'movie,tv_series';
  const page = searchParams.get('page') || '1';
  const query = searchParams.get('query') || '';
  const genres = searchParams.get('genres') || '';
  const tab = searchParams.get('tab') || 'discover';

  // Build the real API URL
  let url = `/api/popular-free?region=${region}&type=${type}&page=${page}`;
  if (query) url = `/api/search?query=${encodeURIComponent(query)}&region=${region}&page=${page}`;
  else if (genres) url += `&genres=${genres}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    console.error('Cached fetch failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to load data' }, { status: 500 });
  }
}
