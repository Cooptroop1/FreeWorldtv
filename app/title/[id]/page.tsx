import Link from 'next/link';

export default function TitlePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-6xl font-bold mb-6">✅ ROUTE IS WORKING!</h1>
      <p className="text-3xl mb-8">ID received: <span className="text-blue-400">{params.id}</span></p>
      
      <Link href="/" className="text-2xl underline hover:text-blue-400">
        ← Back to Home
      </Link>

      <div className="mt-20 text-gray-400 text-sm">
        If you see this page → the dynamic [id] route works.<br />
        Reply with "test page works" and I'll send the full beautiful page next.
      </div>
    </div>
  );
}
