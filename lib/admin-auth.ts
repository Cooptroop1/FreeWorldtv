export function isAdminRequest(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET;
  if (!expected) return false;

  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') || url.searchParams.get('key');
  if (secret === expected) return true;

  const auth = request.headers.get('authorization') || '';
  if (auth === `Bearer ${expected}`) return true;

  const cron = process.env.CRON_SECRET;
  if (cron && auth === `Bearer ${cron}`) return true;

  return false;
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
