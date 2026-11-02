import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { isAdminRequest } from '@/lib/admin-auth';
import { isPremiumPlan } from '@/lib/watchmode-plan';
import { ALLOWED_REGIONS } from '@/lib/regions';
import { sourcesKey } from '@/lib/watchmode-cycle';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Startup-only. Uses Watchmode Changes API to drop stale source caches
 * so the next visitor gets fresh "where to watch" without rebuilding 20k walls.
 * No-op on the free plan (0 credits).
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true, paused: true, skipped: true });
}

