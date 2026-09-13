import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { activeRegions } from '@/lib/watchmode-plan';
import { rememberAccountUser } from '@/lib/account';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const regionRaw = String(body?.region || 'GB').toUpperCase();
  const region = activeRegions().includes(regionRaw) ? regionRaw : 'GB';
  const email = user.emailAddresses?.[0]?.emailAddress;
  await rememberAccountUser(user.id, email, region);
  return NextResponse.json({ success: true, region });
}
