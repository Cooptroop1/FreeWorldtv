import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Retired: this used to hit Watchmode on every request. Use /api/cached-fetch instead.
export async function GET() {
  return NextResponse.json(
    { error: 'Gone. Use /api/cached-fetch' },
    { status: 410 }
  );
}
