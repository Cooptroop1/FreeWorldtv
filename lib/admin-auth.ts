import type { User } from '@clerk/nextjs/server';

export function isAdminRequest(request: Request): boolean {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') || url.searchParams.get('key');
  const auth = request.headers.get('authorization') || '';

  const refresh = process.env.REFRESH_SECRET;
  if (refresh && (secret === refresh || auth === `Bearer ${refresh}`)) return true;

  const cron = process.env.CRON_SECRET;
  if (cron && auth === `Bearer ${cron}`) return true;

  return false;
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function adminToken() {
  return process.env.REFRESH_SECRET || process.env.CRON_SECRET || '';
}

const FALLBACK_ADMINS = ['jcooper4888@aol.co.uk'];

export function isSiteAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const extra = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set([...FALLBACK_ADMINS, ...extra]);
  return (user.emailAddresses || []).some((e) =>
    allowed.has((e.emailAddress || '').toLowerCase())
  );
}
