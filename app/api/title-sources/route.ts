import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',  // ← Uses env var
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get('id');
  const region = searchParams.get('region') || 'US';

  if (!titleId) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  try {
    const result = await client.title.getSources(titleId, {
      regions: region,
    });

    const freeSources = result.data.filter((source: any) => 
      source.type === 'free' || 
      source.price === 0 ||
      source.free_with_ads === true
    );

    return NextResponse.json({ 
      success: true,
      titleId,
      allSources: result.data,
      freeSources,
      message: freeSources.length > 0 ? `${freeSources.length} free options found!` : 'No free sources in this region'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
