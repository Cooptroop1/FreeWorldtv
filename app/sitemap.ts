import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://freestreamworld.com';
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/live-tv`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/radio`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/premium`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/top-10`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
