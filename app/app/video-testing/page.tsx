'use client';

import Link from 'next/link';

export default function VideoTestingPage() {
  return (
    <div className="p-6 bg-gray-950 min-h-screen text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Video Testing</h1>
      <p className="mb-4 text-gray-400">
        Video testing is available via the worksite detail page (cameras per worksite).
      </p>
      <Link
        href="/dashboard"
        className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-medium rounded-lg"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
