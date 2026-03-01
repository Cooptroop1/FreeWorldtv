import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://freestreamworld.com', lastModified: new Date() },
    { url: 'https://freestreamworld.com/about', lastModified: new Date() },
    { url: 'https://freestreamworld.com/privacy', lastModified: new Date() },
    { url: 'https://freestreamworld.com/terms', lastModified: new Date() },
  ];
}
