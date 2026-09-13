import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isSiteAdminUser } from '@/lib/admin-auth';
import { BOARD_KEY, REC_TTL, type BoardItem } from '@/lib/recs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!isSiteAdminUser(user)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const action = body?.action === 'review' ? 'review' : 'title';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const raw = await kv.get(BOARD_KEY);
  let board: BoardItem[] = Array.isArray(raw) ? (raw as BoardItem[]) : [];

  if (action === 'review') {
    board = board.map((row) =>
      row.id === id ? { ...row, reviews: [], review: '' } : row
    );
  } else {
    board = board.filter((row) => row.id !== id);
  }

  await kv.set(BOARD_KEY, board, { ex: REC_TTL });
  return NextResponse.json({ success: true, board: board.slice(0, 15) });
}
