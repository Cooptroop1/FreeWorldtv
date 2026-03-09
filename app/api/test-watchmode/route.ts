import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';

export async function GET() {
  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ error: 'WATCHMODE_API_KEY is NOT set in Vercel!' });
  }

  const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US&types=movie,tv_series&sort_by=popularity_desc&page=1&limit=10`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { rawText };
    }

    return NextResponse.json({
      status: res.status,
      apiKeyPresent: !!WATCHMODE_API_KEY,
      urlUsed: url.replace(WATCHMODE_API_KEY, '***HIDDEN***'),
      watchmodeResponse: data,
      message: data.titles?.length || data.results?.length ? 'Success - titles received' : 'EMPTY - Watchmode returned nothing'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
