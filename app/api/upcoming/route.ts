import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { isPremiumPlan, planFeatures } from '@/lib/watchmode-plan';

export const dynamic = 'force-dynamic';

export async function GET() {
  const features = planFeatures();
  if (!isPremiumPlan()) {
    return NextResponse.json({
      success: true,
      available: false,
      plan: features.plan,
      titles: [],
      message: 'Upcoming releases endpoint is Startup-only.',
    });
  }

  const cached = await kv.get('upcoming_releases');
  if (Array.isArray(cached) && cached.length) {
    return NextResponse.json({ success: true, available: true, fromCache: true, titles: cached });
  }

  const apiKey = process.env.WATCHMODE_API_KEY || '';
  try {
    const res = await fetch(
      `https://api.watchmode.com/v1/releases/?apiKey=${apiKey}&limit=25`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return NextResponse.json({ success: false, available: true, titles: [], error: `HTTP ${res.status}` });
    }
    const data = await res.json();
    const titles = Array.isArray(data) ? data : data.releases || data.titles || [];
    await kv.set('upcoming_releases', titles, { ex: 86400 });
    return NextResponse.json({ success: true, available: true, fromCache: false, titles });
  } catch (err) {
    return NextResponse.json({
      success: false,
      available: true,
      titles: [],
      error: err instanceof Error ? err.message : 'Upcoming fetch failed',
    });
  }
}
