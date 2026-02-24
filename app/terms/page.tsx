export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-300 mb-6">Last updated: February 24, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            Welcome to FreeStream World ("we", "us", or "our"). By accessing or using https://freestreamworld.com (the "Site"), you agree to be bound by these Terms of Service ("Terms").
            If you do not agree, do not use the Site.
          </p>

          <h2 className="text-2xl font-semibold">1. Use of the Site</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>The Site is a directory that links to publicly available free streaming content from third-party services (Tubi, Pluto TV, Freevee, BBC iPlayer, etc.).</li>
            <li>We do not host, stream, or own any video content.</li>
            <li>All content belongs to its respective owners. We are not responsible for the availability, quality, or legality of third-party streams.</li>
          </ul>

          <h2 className="text-2xl font-semibold">2. User-Generated Content (Custom Links)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Users may add their own stream URLs in the "My Links" section. These links are stored locally in your browser only.</li>
            <li>You are solely responsible for the legality of any links you add. Do not add copyrighted or illegal streams.</li>
            <li>We do not review, approve, or endorse user-added links.</li>
          </ul>

          <h2 className="text-2xl font-semibold">3. Ads & Third-Party Services</h2>
          <p>We may display advertisements (including Google AdSense). Third-party services (Watchmode, TMDB, Google) may collect anonymized data per their policies.</p>

          <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
          <p>All trademarks, logos, and content on the Site belong to their owners. You may not copy or reproduce Site content without permission.</p>

          <h2 className="text-2xl font-semibold">5. Disclaimer & Limitation of Liability</h2>
          <p>The Site is provided "as is" without warranties. We are not liable for any damages arising from use of the Site or third-party streams, including but not limited to data loss, malware, or legal issues from user-added links.</p>

          <h2 className="text-2xl font-semibold">6. Changes to Terms</h2>
          <p>We may update these Terms. Continued use after changes constitutes acceptance.</p>

          <h2 className="text-2xl font-semibold">7. Governing Law</h2>
          <p>These Terms are governed by the laws of [your country/state, e.g. United States].</p>

          <p className="mt-8 text-sm text-gray-500">
            This is a basic Terms of Service generated for informational purposes. For legal advice, consult a professional.
          </p>
        </div>
      </div>
    </main>
  );
}
