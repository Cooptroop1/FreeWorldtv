import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clampList } from '@/lib/safe-url';
import { rememberAccountUser, type LibraryItem } from '@/lib/account';

export const dynamic = 'force-dynamic';

function sanitize(list: unknown): LibraryItem[] {
  return clampList<LibraryItem>(list, 400).filter(
    (item): item is LibraryItem => Boolean(item && Number(item.id) && item.status)
  );
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ library: [] });
  const library = (await kv.get(`library:${user.id}`)) || [];
  return NextResponse.json({ library: Array.isArray(library) ? library : [] });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const library = sanitize(body?.library);
  await kv.set(`library:${user.id}`, library, { ex: 60 * 60 * 24 * 365 });
  const email = user.emailAddresses?.[0]?.emailAddress;
  await rememberAccountUser(user.id, email);
  return NextResponse.json({ success: true, count: library.length });
}
