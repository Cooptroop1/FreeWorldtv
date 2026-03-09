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

    return NextResponse.json({
      snapshotKey: 'full_free_catalog',
      titleCount: size,
      lastRefresh: lastRefreshDate,
      status: size > 1000 
        ? '✅ GOOD — snapshot has real titles' 
        : '❌ EMPTY — run the refresh link below'
    });
  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message || 'Unknown error checking snapshot' 
    });
  }
}
