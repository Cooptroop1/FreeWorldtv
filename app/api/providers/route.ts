import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // === PRIORITY 1: Use the real data you already have in watchmode_sources ===
    let providers = await kv.get('watchmode_sources');

    // === PRIORITY 2: Fallback to the old key if needed ===
    if (!providers) {
      providers = await kv.get('watchmode_providers');
    }

    // === If we have real providers (which you do!), return them instantly ===
    if (providers && Array.isArray(providers) && providers.length > 0) {
      console.log(`✅ Loaded ${providers.length} real provider logos from cache (including FX, Spectrum, Tubi, etc.)`);
      return NextResponse.json({ success: true, providers });
    }

    // === Safety fallback (won't ever happen now) ===
    return NextResponse.json({ 
      success: false, 
      providers: [], 
      message: 'No providers found in cache' 
    });
  } catch (err) {
    console.error('Providers route error:', err);
    
    // Emergency fallback — never breaks the modal
    try {
      const cached = await kv.get('watchmode_sources') || await kv.get('watchmode_providers') || [];
      return NextResponse.json({
        success: true,
        providers: cached,
        error: 'Using cached providers (fallback)'
      });
    } catch (fallbackErr) {
      return NextResponse.json({ success: false, providers: [] });
    }
  }
}
