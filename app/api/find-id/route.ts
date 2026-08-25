import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { catalogKey, isAllowedRegion } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'free';
  const search = searchParams.get('search')?.toLowerCase().trim() || '';
  const regionRaw = (searchParams.get('region') || 'GB').toUpperCase();
  if (!isAllowedRegion(regionRaw)) {
    return NextResponse.json({ error: 'Unsupported region' }, { status: 400 });
  }

  const raw = await kv.get<{ id: number; title: string; year?: number }[]>(
    catalogKey(type === 'paid', regionRaw)
  );
  const catalog = Array.isArray(raw) ? raw : [];
  const matches = search
    ? catalog.filter((t) => t.title?.toLowerCase().includes(search))
    : catalog;

  return NextResponse.json({
    success: true,
    region: regionRaw,
    searched: search || '(all)',
    type,
    totalFound: matches.length,
    results: matches.slice(0, 30).map((t) => ({
      id: t.id,
      title: t.title,
      year: t.year || '',
    })),
  });
}
