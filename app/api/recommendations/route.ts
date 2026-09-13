import { kv } from '@vercel/kv';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rememberAccountUser } from '@/lib/account';
import {
  BOARD_KEY,
  REC_LIMIT,
  REC_TTL,
  applyRecToBoard,
  cleanReview,
  recsUserKey,
  slimRec,
  type BoardItem,
  type RecItem,
} from '@/lib/recs';

export const dynamic = 'force-dynamic';

async function readMine(userId: string): Promise<RecItem[]> {
  const raw = await kv.get(recsUserKey(userId));
  return Array.isArray(raw) ? (raw as RecItem[]) : [];
}

async function readBoard(): Promise<BoardItem[]> {
  const raw = await kv.get(BOARD_KEY);
  return Array.isArray(raw) ? (raw as BoardItem[]) : [];
}

export async function GET() {
  const board = await readBoard();
  const user = await currentUser();
  const mine = user ? await readMine(user.id) : [];
  return NextResponse.json({
    success: true,
    board: board.slice(0, 15),
    mine,
    limit: REC_LIMIT,
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to recommend' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const review = cleanReview(body.review);
  const item = slimRec(body as Record<string, unknown>, review);
  if (!item) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  const mine = await readMine(user.id);
  const existing = mine.find((r) => r.id === item.id);
  if (!existing && mine.length >= REC_LIMIT) {
    return NextResponse.json(
      { error: `You can recommend ${REC_LIMIT} titles. Remove one first.` },
      { status: 400 }
    );
  }

  const nextMine = existing
    ? mine.map((r) => (r.id === item.id ? item : r))
    : [...mine, item];
  await kv.set(recsUserKey(user.id), nextMine, { ex: REC_TTL });

  let board = await readBoard();
  if (existing) {
    board = applyRecToBoard(board, existing, -1);
  }
  board = applyRecToBoard(board, item, 1);
  await kv.set(BOARD_KEY, board, { ex: REC_TTL });

  const email = user.emailAddresses?.[0]?.emailAddress;
  await rememberAccountUser(user.id, email);

  return NextResponse.json({ success: true, mine: nextMine, board: board.slice(0, 15) });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const mine = await readMine(user.id);
  const removed = mine.find((r) => r.id === id);
  const nextMine = mine.filter((r) => r.id !== id);
  await kv.set(recsUserKey(user.id), nextMine, { ex: REC_TTL });

  if (removed) {
    const board = applyRecToBoard(await readBoard(), removed, -1);
    await kv.set(BOARD_KEY, board, { ex: REC_TTL });
    return NextResponse.json({ success: true, mine: nextMine, board: board.slice(0, 15) });
  }

  return NextResponse.json({ success: true, mine: nextMine, board: (await readBoard()).slice(0, 15) });
}
