import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',  // ← Uses env var
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'US';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const contentType = searchParams.get('type') || 'movie,tv_series';

  try {
    const listResult = await client.title.list({
      regions: region,
      sourceTypes: 'free',
      sortBy: 'popularity_desc',
      page: page,
      limit: 20,
      types: contentType,
    });

    return NextResponse.json({ 
      success: true,
      region,
      page,
      titles: listResult.data.titles || [],
      totalPages: listResult.data.total_pages || 1,
      totalResults: listResult.data.total_results || (listResult.data.titles?.length || 0),
      message: `Found ${listResult.data.titles?.length || 0} popular free titles (${contentType}) in ${region}`
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
