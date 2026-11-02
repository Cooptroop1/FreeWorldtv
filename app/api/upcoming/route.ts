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

  return NextResponse.json({ success: true, available: false, titles: [], paused: true });
}

