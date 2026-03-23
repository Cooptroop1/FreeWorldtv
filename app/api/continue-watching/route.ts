import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ continueWatching: [] });
  const continueWatching = await kv.get(`continue-watching:${user.id}`) || [];
  return NextResponse.json({ continueWatching });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { continueWatching } = await request.json();
  await kv.set(`continue-watching:${user.id}`, continueWatching, { ex: 60 * 60 * 24 * 365 }); // 1 year
  return NextResponse.json({ success: true });
}
