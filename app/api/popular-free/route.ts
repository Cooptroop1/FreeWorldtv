import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: 'b2HmkbZroSfdahf6vZ12p2xYSggJDjNTzWmNROKv',  // ← Replace with your actual key
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'US';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const contentType = searchParams.get('type') || 'movie,tv_series';  // Default: both movies and TV

  try {
    const listResult = await client.title.list({
      regions: region,
      sourceTypes: 'free',           // Only titles with at least one free source
      sortBy: 'popularity_desc',     // Most popular first
      page: page,
      limit: 20,                     // Items per page
      types: contentType,            // Now configurable via ?type=movie or ?type=tv_series or both
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