import { MetadataRoute } from 'next';
import { listSitemapTitles } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://freestreamworld.com';
  const now = new Date();

  let titleEntries: MetadataRoute.Sitemap = [];
  try {
    const titles = await listSitemapTitles(400);
    titleEntries = titles.map((t) => ({
      url: `${baseUrl}/title/${t.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    titleEntries = [];
  }

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/live-tv`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/radio`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/premium`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/top-10`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ...titleEntries,
  ];
}
