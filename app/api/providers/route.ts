import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const CACHE_KEY = 'watchmode_providers';
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function GET() {
  try {
    // Check cached data + timestamp
    const cached = await kv.get(CACHE_KEY);
    const lastUpdated = await kv.get('watchmode_providers_updated');

    const now = Date.now();
    const isStale = !lastUpdated || (now - Number(lastUpdated)) > CACHE_TTL * 1000;

    if (cached && !isStale) {
      return NextResponse.json({ success: true, providers: cached });
    }

    // Refresh from Watchmode API
    const res = await fetch('https://api.watchmode.com/v1/providers/?apiKey=' + process.env.WATCHMODE_API_KEY, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error('Watchmode providers failed');

    const data = await res.json();
    const providers = data.results || data;

    // Save to KV with timestamp
    await kv.set(CACHE_KEY, providers);
    await kv.set('watchmode_providers_updated', now);

    console.log('✅ Providers cache refreshed from Watchmode');

    return NextResponse.json({ success: true, providers });
  } catch (err) {
    console.error('Providers cache error:', err);

    // Fallback to cached data if refresh fails
    const cached = await kv.get(CACHE_KEY);
    return NextResponse.json({
      success: !!cached,
      providers: cached || [],
      error: 'Using cached providers (Watchmode refresh failed)'
    });
  }
}
