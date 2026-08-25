import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clampList } from '@/lib/safe-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ favorites: [] });
  const favorites = (await kv.get(`favorites:${user.id}`)) || [];
  return NextResponse.json({ favorites: Array.isArray(favorites) ? favorites : [] });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const favorites = clampList(body?.favorites, 200);
  await kv.set(`favorites:${user.id}`, favorites, { ex: 60 * 60 * 24 * 365 });
  return NextResponse.json({ success: true, count: favorites.length });
}
