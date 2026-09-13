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

  const apiKey = process.env.WATCHMODE_API_KEY || '';
  try {
    const [seasonsRes, episodesRes] = await Promise.all([
      fetch(`https://api.watchmode.com/v1/title/${id}/seasons/?apiKey=${apiKey}`, { cache: 'no-store' }),
      fetch(`https://api.watchmode.com/v1/title/${id}/episodes/?apiKey=${apiKey}`, { cache: 'no-store' }),
    ]);
    const seasonsJson = seasonsRes.ok ? await seasonsRes.json() : [];
    const episodesJson = episodesRes.ok ? await episodesRes.json() : [];
    const seasons = Array.isArray(seasonsJson) ? seasonsJson : seasonsJson.seasons || [];
    const episodes = (Array.isArray(episodesJson) ? episodesJson : episodesJson.episodes || []).slice(0, 80);
    const payload = { seasons, episodes };
    await kv.set(cacheKey, payload, { ex: 86400 * 7 });
    return NextResponse.json({ success: true, available: true, fromCache: false, ...payload });
  } catch (err) {
    return NextResponse.json({
      success: false,
      available: true,
      error: err instanceof Error ? err.message : 'Episode fetch failed',
    }, { status: 500 });
  }
}
