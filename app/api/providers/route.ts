import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const providers = await kv.get('watchmode_sources');
    if (providers && Array.isArray(providers)) {
      return NextResponse.json({ success: true, providers });
    }
  } catch (e) {
    console.error('Providers cache read failed:', e);
  }
  return NextResponse.json({ success: false, providers: [] });
}
