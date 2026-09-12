import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { SERVICE_OPTIONS, rememberAccountUser } from '@/lib/account';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(SERVICE_OPTIONS.map((s) => s.id));

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ services: [] });
  const services = (await kv.get(`my-services:${user.id}`)) || [];
  return NextResponse.json({
    services: Array.isArray(services) ? services.filter((id) => ALLOWED.has(String(id))) : [],
    options: SERVICE_OPTIONS.map(({ id, label }) => ({ id, label })),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const incoming = Array.isArray(body?.services) ? body.services : [];
  const services = incoming.map(String).filter((id: string) => ALLOWED.has(id)).slice(0, 30);
  await kv.set(`my-services:${user.id}`, services, { ex: 60 * 60 * 24 * 365 });
  const email = user.emailAddresses?.[0]?.emailAddress;
  await rememberAccountUser(user.id, email);
  return NextResponse.json({ success: true, services });
}
