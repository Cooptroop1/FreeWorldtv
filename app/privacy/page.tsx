export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-300 mb-6">Last updated: February 24, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            FreeStream World ("we", "us", or "our") operates https://freestreamworld.com (the "Site").
            This Privacy Policy explains what information we collect, how we use it, and your rights.
          </p>

          <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
          <p>We collect **no personal information** such as names, emails, or IP addresses unless you voluntarily provide it.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Local browser storage (localStorage) for your favorites and custom links (not sent to us)</li>
            <li>Anonymous usage data from third-party APIs (Watchmode, TMDB) for titles and posters</li>
          </ul>

          <h2 className="text-2xl font-semibold">2. Third-Party Services & Ads</h2>
          <p>We use:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Watchmode API — to find streaming sources</li>
            <li>TMDB API — to display posters</li>
            <li>Google AdSense (if enabled) — to display ads</li>
          </ul>
          <p>These services may collect anonymized data per their own policies. See:</p>
          <ul className="list-disc pl-6">
            <li>Watchmode: https://api.watchmode.com/privacy</li>
            <li>TMDB: https://www.themoviedb.org/privacy-policy</li>
            <li>Google AdSense: https://policies.google.com/privacy</li>
          </ul>

          <h2 className="text-2xl font-semibold">3. Cookies & Tracking</h2>
          <p>We use minimal local storage for user preferences (favorites, custom links). No tracking cookies or analytics are used unless you enable ads.</p>

          <h2 className="text-2xl font-semibold">4. Your Rights</h2>
          <p>You can clear localStorage in your browser settings to remove saved favorites/links. We do not store or share personal data.</p>

          <h2 className="text-2xl font-semibold">5. Changes</h2>
          <p>We may update this policy. Check back for changes.</p>

          <p className="mt-8 text-sm text-gray-500">
            This is a basic policy generated for informational purposes. For legal advice, consult a professional.
          </p>
        </div>
      </div>
    </main>
  );
}
