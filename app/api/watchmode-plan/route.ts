import { NextResponse } from 'next/server';
import { planFeatures } from '@/lib/watchmode-plan';
import { REGION_LABELS } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const features = planFeatures();
  return NextResponse.json({
    success: true,
    ...features,
    regionOptions: features.regions.map((code) => ({
      code,
      label: REGION_LABELS[code] || code,
    })),
  });
}
