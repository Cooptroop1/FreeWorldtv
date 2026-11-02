import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { isPremiumPlan, planFeatures } from '@/lib/watchmode-plan';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  const features = planFeatures();
  if (!isPremiumPlan()) {
    return NextResponse.json({
      success: true,
      available: false,
      plan: features.plan,
      episodes: [],
      seasons: [],
      message: 'Episode-level links unlock on the Watchmode Startup plan.',
    });
  }

  const cacheKey = `episodes:${id}`;
  const cached = await kv.get(cacheKey);
  if (cached && typeof cached === 'object') {
    return NextResponse.json({ success: true, available: true, fromCache: true, ...(cached as object) });
  }

  return NextResponse.json({
    success: true,
    available: false,
    episodes: [],
    seasons: [],
    paused: true,
  });
}

