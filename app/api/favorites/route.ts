import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ favorites: [] });

  const favorites = await kv.get(`favorites:${user.id}`) || [];
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { favorites } = await request.json();
  await kv.set(`favorites:${user.id}`, favorites, { ex: 60 * 60 * 24 * 365 }); // 1 year

  return NextResponse.json({ success: true });
}
