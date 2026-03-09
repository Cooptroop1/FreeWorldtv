import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mySuperSecretRefreshKey2026xyz123';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('key');

  if (secret !== REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WATCHMODE_API_KEY) {
    return NextResponse.json({ 
      error: 'WATCHMODE_API_KEY is MISSING in Vercel Environment Variables!',
      fix: 'Add WATCHMODE_API_KEY in Vercel Dashboard → Settings → Environment Variables'
    }, { status: 500 });
  }

  console.log('🚀 DEBUG REFRESH STARTED...');
  let allTitles: any[] = [];
  let page = 1;
  let totalCalls = 0;

  try {
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_API_KEY}&source_types=free&regions=US,GB,CA,AU&types=movie,tv_series&sort_by=popularity_desc&page=1&limit=250`;
    
    console.log('📡 Calling Watchmode with URL:', url.replace(WATCHMODE_API_KEY, '***HIDDEN***'));
    
    const res = await fetch(url, { cache: 'no-store' });
    totalCalls++;

    const rawText = await res.text(); // get raw response first
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    console.log(`Status: ${res.status} | Titles returned: ${data.titles?.length || data.results?.length || 0}`);

    const pageTitles = data.titles || data.results || [];

    return NextResponse.json({
      success: true,
      debug: true,
      statusCode: res.status,
      apiKeyPresent: !!WATCHMODE_API_KEY,
      firstPageTitles: pageTitles.length,
      sampleTitle: pageTitles[0] ? pageTitles[0].title : 'NONE',
      fullResponse: data,
      callsMade: totalCalls,
      message: pageTitles.length === 0 
        ? 'Watchmode returned EMPTY on page 1 — this is the problem'
        : `Success! ${pageTitles.length} titles on page 1`
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Refresh crashed — see above'
    });
  }
}
