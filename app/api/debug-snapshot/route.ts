import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const snapshot = await kv.get('full_free_catalog');
    const size = Array.isArray(snapshot) ? snapshot.length : 0;

    const lastRefreshRaw = await kv.get('lastFullRefresh');
    
    let lastRefreshDate = 'never';
    if (lastRefreshRaw) {
      const timestamp = typeof lastRefreshRaw === 'number' 
        ? lastRefreshRaw 
        : Number(lastRefreshRaw);
      if (!isNaN(timestamp)) {
        lastRefreshDate = new Date(timestamp).toISOString();
      }
    }

        const premiumSnapshot = await kv.get('full_premium_catalog');
    const premiumSize = Array.isArray(premiumSnapshot) ? premiumSnapshot.length : 0;
    const totalTitles = size + premiumSize;

    return NextResponse.json({
      snapshotKey: 'full_free_catalog + full_premium_catalog',
      freeCount: size,
      premiumCount: premiumSize,
      totalTitles: totalTitles,
      lastRefresh: lastRefreshDate,
      status: (size > 1000 && premiumSize > 1000)
        ? `✅ GOOD — 20 pages each (≈5k free + ≈5k premium)`
        : 'EMPTY — run the refresh link below'
    });
  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message || 'Unknown error checking snapshot' 
    });
  }
}
