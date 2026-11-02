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

  return NextResponse.json({ success: true, titles: [], totalResults: 0, paused: true });
}

