import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const snapshot = await kv.get('full_free_catalog');
    const size = Array.isArray(snapshot) ? snapshot.length : 0;
    const lastRefresh = await kv.get('lastFullRefresh');

    return NextResponse.json({
      snapshotKey: 'full_free_catalog',
      titleCount: size,
      lastRefresh: lastRefresh ? new Date(lastRefresh).toISOString() : 'never',
      status: size > 1000 ? 'GOOD - snapshot has data' : 'EMPTY - run the refresh link below'
    });
  } catch (e) {
    return NextResponse.json({ error: e.message });
  }
}
