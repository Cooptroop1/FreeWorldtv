import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { WatchmodeClient } from '@watchmode/api-client';
import { currentUser } from '@clerk/nextjs/server';
import { activeRegions } from '@/lib/watchmode-plan';
import { secondsUntilNextCycle, sourcesAtKey, sourcesKey, CYCLE_DAY } from '@/lib/watchmode-cycle';
import type { AlertItem } from '@/lib/account';

export const dynamic = 'force-dynamic';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

function isFreeSource(s: any) {
  return s.type === 'free' || s.price === 0 || s.free_with_ads === true;
}

function isPaidSource(s: any) {
  return s.type === 'sub' || s.subscription === true || (!!s.price && s.price > 0);
}

function freeNames(sources: any[]): string[] {
  return sources.filter(isFreeSource).map((s) => String(s.name || '')).filter(Boolean);
}

async function maybeAlertDrop(userId: string, titleId: string, region: string, names: string[]) {
  const snapKey = `favsnap:${userId}:${titleId}:${region}`;
  const prev = ((await kv.get(snapKey)) || []) as string[];
  await kv.set(snapKey, names, { ex: 86400 * 365 });
  if (!Array.isArray(prev) || !prev.length || names.length > 0) return;
  const favs = ((await kv.get(`favorites:${userId}`)) || []) as { id: number; title?: string; year?: number }[];
  const fav = Array.isArray(favs) ? favs.find((f) => Number(f.id) === Number(titleId)) : null;
  if (!fav) return;
  const alerts = ((await kv.get(`alerts:${userId}`)) || []) as AlertItem[];
  const list = Array.isArray(alerts) ? alerts : [];
  if (list.some((a) => a.titleId === fav.id && Date.now() - new Date(a.createdAt).getTime() < 14 * 86400000)) {
    return;
  }
  list.unshift({
    id: `${fav.id}-${Date.now()}`,
    titleId: fav.id,
    title: fav.title || 'A saved title',
    year: fav.year,
    region,
    message: `No longer listed as free in ${region}.`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  await kv.set(`alerts:${userId}`, list.slice(0, 30), { ex: 86400 * 365 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleId = searchParams.get('id');
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  const region = activeRegions().includes(regionRaw) ? regionRaw : 'GB';
  const paid = searchParams.get('paid') === 'true';

  if (!titleId || !/^\d+$/.test(titleId)) {
    return NextResponse.json({ success: false, error: 'Missing title id' }, { status: 400 });
  }

  const cacheKey = sourcesKey(titleId, region);
  let cachedFull = await kv.get<unknown[]>(cacheKey);
  if ((!cachedFull || !Array.isArray(cachedFull)) && new Date().getUTCDate() < CYCLE_DAY) {
    cachedFull = await kv.get<unknown[]>(`sources:${titleId}:${region}`);
  }
  if (cachedFull && Array.isArray(cachedFull)) {
    const sourcesData = paid
      ? cachedFull.filter((s) => isPaidSource(s))
      : cachedFull.filter((s) => isFreeSource(s));
    const user = await currentUser();
    if (user) await maybeAlertDrop(user.id, titleId, region, freeNames(cachedFull));
    return NextResponse.json({
      success: true,
      titleId,
      allSources: cachedFull,
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      fromCache: true,
    });
  }

  try {
    const result = await client.title.getSources(titleId, { regions: region });
    const fullSources = result.data || [];
    const sourcesData = paid
      ? fullSources.filter((s: any) => isPaidSource(s))
      : fullSources.filter((s: any) => isFreeSource(s));

    const ttl = secondsUntilNextCycle();
    await kv.set(cacheKey, fullSources, { ex: ttl });
    await kv.set(sourcesAtKey(titleId, region), Date.now(), { ex: ttl });
    const user = await currentUser();
    if (user) await maybeAlertDrop(user.id, titleId, region, freeNames(fullSources));

    return NextResponse.json({
      success: true,
      titleId,
      allSources: fullSources,
      freeSources: paid ? [] : sourcesData,
      paidSources: paid ? sourcesData : [],
      sources: sourcesData,
      fromCache: false,
    });
  } catch (error: unknown) {
    console.error('Title sources error:', error);
    await kv.set(cacheKey, [], { ex: 3600 });
    const message = error instanceof Error ? error.message : 'Failed to fetch sources';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
