import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { isAdminRequest } from '@/lib/admin-auth';
import { activeRegions } from '@/lib/watchmode-plan';
import type { AlertItem } from '@/lib/account';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_USERS = 80;
const MAX_FAVS = 20;
const MAX_FETCHES = 40;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function isFreeSource(s: { type?: string; price?: number; free_with_ads?: boolean }) {
  return s.type === 'free' || s.price === 0 || s.free_with_ads === true;
}

function freeNames(sources: unknown[]): string[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter((s) => isFreeSource(s as { type?: string }))
    .map((s) => String((s as { name?: string }).name || ''))
    .filter(Boolean);
}

async function maybeEmail(to: string, title: string, region: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.ALERTS_FROM_EMAIL || 'FreeStream World <alerts@freestreamworld.com>';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `${title} is no longer free in ${region}`,
        html: `<p><strong>${title}</strong> dropped off the free list in ${region}.</p>
<p>Open <a href="https://freestreamworld.com/favorites">your lists</a> on FreeStream World to check sources.</p>`,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userIds = ((await kv.smembers('library_users')) || []).map(String).slice(0, MAX_USERS);
  const apiKey = process.env.WATCHMODE_API_KEY || '';
  let fetches = 0;
  let alertsCreated = 0;
  const checked: string[] = [];

  for (const userId of userIds) {
    if (fetches >= MAX_FETCHES) break;
    const prefs = ((await kv.get(`prefs:${userId}`)) || {}) as { region?: string; email?: string };
    const regionRaw = String(prefs.region || 'GB').toUpperCase();
    const region = activeRegions().includes(regionRaw) ? regionRaw : 'GB';
    const favorites = ((await kv.get(`favorites:${userId}`)) || []) as { id: number; title?: string; year?: number }[];
    if (!Array.isArray(favorites) || !favorites.length) continue;

    const alerts = ((await kv.get(`alerts:${userId}`)) || []) as AlertItem[];
    const list = Array.isArray(alerts) ? alerts : [];
    let changed = false;

    for (const fav of favorites.slice(0, MAX_FAVS)) {
      if (!fav?.id) continue;
      const sourcesKey = `sources:${fav.id}:${region}`;
      const atKey = `sources_at:${fav.id}:${region}`;
      const snapKey = `favsnap:${userId}:${fav.id}:${region}`;
      const fetchedAt = Number((await kv.get(atKey)) || 0);
      let sources = (await kv.get(sourcesKey)) as unknown[] | null;

      const stale = !fetchedAt || Date.now() - fetchedAt > STALE_MS;
      if ((!Array.isArray(sources) || stale) && apiKey && fetches < MAX_FETCHES) {
        try {
          const res = await fetch(
            `https://api.watchmode.com/v1/title/${fav.id}/sources/?apiKey=${apiKey}&regions=${region}`,
            { cache: 'no-store' }
          );
          fetches += 1;
          if (res.ok) {
            const data = await res.json();
            sources = Array.isArray(data) ? data : data.sources || [];
            await kv.set(sourcesKey, sources, { ex: 86400 * 30 });
            await kv.set(atKey, Date.now(), { ex: 86400 * 30 });
          }
        } catch {
          fetches += 1;
        }
      }

      const names = freeNames(sources || []);
      const prev = ((await kv.get(snapKey)) || []) as string[];
      const prevNames = Array.isArray(prev) ? prev : [];
      if (prevNames.length > 0 && names.length === 0) {
        const recent = list.some(
          (a) => a.titleId === fav.id && Date.now() - new Date(a.createdAt).getTime() < 14 * 86400000
        );
        if (!recent) {
          list.unshift({
            id: `${fav.id}-${Date.now()}`,
            titleId: fav.id,
            title: fav.title || 'A saved title',
            year: fav.year,
            region,
            message: `No longer listed as free in ${region}.`,
            createdAt: new Date().toISOString(),
            read: false,
          });
          changed = true;
          alertsCreated += 1;
          if (prefs.email) await maybeEmail(prefs.email, fav.title || 'A saved title', region);
        }
      }
      await kv.set(snapKey, names, { ex: 86400 * 365 });
    }

    if (changed) {
      await kv.set(`alerts:${userId}`, list.slice(0, 30), { ex: 86400 * 365 });
    }
    checked.push(userId);
  }

  return NextResponse.json({
    success: true,
    users: checked.length,
    fetches,
    alertsCreated,
  });
}
