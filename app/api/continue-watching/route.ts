import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clampList } from '@/lib/safe-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ continueWatching: [] });
  const continueWatching = (await kv.get(`continue-watching:${user.id}`)) || [];
  return NextResponse.json({ continueWatching: Array.isArray(continueWatching) ? continueWatching : [] });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const continueWatching = clampList(body?.continueWatching, 20);
  await kv.set(`continue-watching:${user.id}`, continueWatching, { ex: 60 * 60 * 24 * 365 });
  return NextResponse.json({ success: true, count: continueWatching.length });
}
