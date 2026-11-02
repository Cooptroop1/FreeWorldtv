import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { ingestTitleIdMap } from '@/lib/watchmode-map';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true, paused: true, message: 'Title map download is paused.' });
}
