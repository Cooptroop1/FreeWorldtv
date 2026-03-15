import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_API_KEY || '',
});

export async function GET() {
  try {
    const cacheKey = 'watchmode_providers';

    // Check cache first
    let providers = await kv.get(cacheKey);
    if (Array.isArray(providers) && providers.length > 0) {
      console.log(`✅ Returning ${providers.length} cached providers`);
      return NextResponse.json(providers);
    }

    // First-time fetch (only happens once every 30 days)
    console.log('⚡ Fetching providers list from Watchmode (1 call)');
    const result = await client.sources.list();
    providers = result.data || [];

    // Save for 30 days
    await kv.set(cacheKey, providers, { ex: 86400 * 30 });

    console.log(`✅ Saved ${providers.length} providers for 30 days`);
    return NextResponse.json(providers);

  } catch (err) {
    console.error('Providers route error:', err);
    return NextResponse.json([]);
  }
}
