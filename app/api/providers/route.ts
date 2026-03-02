import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Pull directly from the key where your data actually lives
    let providers = await kv.get('watchmode_sources') || await kv.get('watchmode_providers') || [];

    if (Array.isArray(providers) && providers.length > 0) {
      console.log(`✅ Returning ${providers.length} real providers (including FX, Spectrum, etc.)`);
      return NextResponse.json(providers);
    }

    console.log('⚠️ No providers found in cache');
    return NextResponse.json([]);
  } catch (err) {
    console.error('Providers route error:', err);
    return NextResponse.json([]);
  }
}
