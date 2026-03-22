import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const freeRaw = await kv.get('full_free_catalog');
    const premiumRaw = await kv.get('full_premium_catalog');

    const freeCount = Array.isArray(freeRaw) ? freeRaw.length : 0;
    const premiumCount = Array.isArray(premiumRaw) ? premiumRaw.length : 0;
    const totalTitles = freeCount + premiumCount;

    const lastRefreshRaw = await kv.get('lastFullRefresh');
    let lastRefreshDate = 'never';
    if (lastRefreshRaw) {
      const ts = typeof lastRefreshRaw === 'number' ? lastRefreshRaw : Number(lastRefreshRaw);
      if (!isNaN(ts)) lastRefreshDate = new Date(ts).toISOString();
    }

    // Show 3 sample titles so you can literally see what's downloaded
    const freeSample = Array.isArray(freeRaw) && freeRaw.length > 0 
      ? freeRaw.slice(0, 3).map((t: any) => ({ id: t.id, title: t.title, year: t.year })) 
      : [];

    const premiumSample = Array.isArray(premiumRaw) && premiumRaw.length > 0 
      ? premiumRaw.slice(0, 3).map((t: any) => ({ id: t.id, title: t.title, year: t.year })) 
      : [];

    return NextResponse.json({
      status: "✅ SNAPSHOT CHECK",
      freeTitlesSaved: freeCount,
      premiumTitlesSaved: premiumCount,
      totalTitlesSaved: totalTitles,
      lastFullRefresh: lastRefreshDate,
      expectedFor60Pages: "≈15,000+ total titles (60 pages each)",
      freeSampleTitles: freeSample,
      premiumSampleTitles: premiumSample,
      note: "This is what is actually stored in cache. Refresh still uses 0 extra calls here.",
      advice: freeCount > 10000 
        ? "✅ Catalog looks healthy!" 
        : "Run the full refresh link if numbers are low"
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'KV read failed' }, { status: 500 });
  }
}
