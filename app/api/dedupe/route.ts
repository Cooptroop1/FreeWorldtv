import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.REFRESH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const freeRaw = await kv.get('full_free_catalog');
  const premiumRaw = await kv.get('full_premium_catalog');

  const free: any[] = Array.isArray(freeRaw) ? freeRaw : [];
  const premium: any[] = Array.isArray(premiumRaw) ? premiumRaw : [];

  const freeIds = new Set();
  const premiumIds = new Set();

  const cleanFree = free.filter(t => !freeIds.has(t.id) && freeIds.add(t.id));
  const cleanPremium = premium.filter(t => !premiumIds.has(t.id) && premiumIds.add(t.id));

  const removedFree = free.length - cleanFree.length;
  const removedPremium = premium.length - cleanPremium.length;

  await kv.set('full_free_catalog', cleanFree, { ex: 86400 * 30 });
  await kv.set('full_premium_catalog', cleanPremium, { ex: 86400 * 30 });

  return NextResponse.json({
    success: true,
    beforeFree: free.length,
    beforePremium: premium.length,
    afterFree: cleanFree.length,
    afterPremium: cleanPremium.length,
    removedFree,
    removedPremium,
    message: `Duplicates removed: ${removedFree} free + ${removedPremium} premium. Now clean!`
  });
}
