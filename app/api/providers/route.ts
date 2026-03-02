import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const CACHE_KEY = 'watchmode_providers';
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

export async function GET() {
  try {
    // Check if we have fresh cached providers
    const cached = await kv.get(CACHE_KEY);
    const lastUpdated = await kv.get('watchmode_providers_updated');

    const now = Date.now();
    const isStale = !lastUpdated || (now - Number(lastUpdated)) > CACHE_TTL * 1000;

    if (cached && !isStale) {
      return NextResponse.json({ success: true, providers: cached });
    }

    // Only fetch fresh if the cache is older than 24h (your daily snapshot will keep it updated)
    console.log('🔄 Providers cache stale → fetching fresh logos from Watchmode...');

    const res = await fetch('https://api.watchmode.com/v1/providers/?apiKey=' + process.env.WATCHMODE_API_KEY, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error('Watchmode providers failed');

    const data = await res.json();
    const providers = data.results || data;

    // Save to KV for the next 24 hours
    await kv.set(CACHE_KEY, providers);
    await kv.set('watchmode_providers_updated', now);

    console.log(`✅ Cached ${providers.length} real provider logos (will last 24h)`);

    return NextResponse.json({ success: true, providers });
  } catch (err) {
    console.error('Providers cache error:', err);

    // Fallback to whatever we have (won't break the site)
    const cached = await kv.get(CACHE_KEY);
    return NextResponse.json({
      success: !!cached,
      providers: cached || [],
      error: 'Using cached providers'
    });
  }
}
