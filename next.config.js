/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',        // already had this for posters
      },
      {
        protocol: 'https',
        hostname: 'cdn.watchmode.com',     // ← THIS IS THE MISSING LINE
      },
    ],
  },
  // (keep any other settings you already have)
};

module.exports = nextConfig;
