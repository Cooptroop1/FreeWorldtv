import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rememberAccountUser, type AlertItem } from '@/lib/account';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ alerts: [] });
  const email = user.emailAddresses?.[0]?.emailAddress;
  await rememberAccountUser(user.id, email);
  const alerts = (await kv.get(`alerts:${user.id}`)) || [];
  return NextResponse.json({ alerts: Array.isArray(alerts) ? alerts : [] });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const alerts = ((await kv.get(`alerts:${user.id}`)) || []) as AlertItem[];
  const list = Array.isArray(alerts) ? alerts : [];

  if (body?.action === 'read') {
    const next = list.map((a) => ({ ...a, read: true }));
    await kv.set(`alerts:${user.id}`, next, { ex: 60 * 60 * 24 * 365 });
    return NextResponse.json({ success: true, alerts: next });
  }

  if (body?.action === 'dismiss' && body.id) {
    const next = list.filter((a) => a.id !== body.id);
    await kv.set(`alerts:${user.id}`, next, { ex: 60 * 60 * 24 * 365 });
    return NextResponse.json({ success: true, alerts: next });
  }

  return NextResponse.json({ success: true, alerts: list });
}
