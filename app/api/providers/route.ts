import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

export const dynamic = 'force-dynamic';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

export async function GET() {
  try {
    const cacheKey = 'watchmode_providers';
    const cached: unknown[] = (await kv.get(cacheKey)) || [];
    if (Array.isArray(cached) && cached.length > 0) {
      return NextResponse.json(cached);
    }

    const result = await client.sources.list();
    const providers = Array.isArray(result.data) ? result.data : [];
    await kv.set(cacheKey, providers, { ex: 86400 * 30 });
    return NextResponse.json(providers);
  } catch (err) {
    console.error('Providers route error:', err);
    return NextResponse.json([]);
  }
}
