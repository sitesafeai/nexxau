'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Building2, MessageSquare, RefreshCw } from 'lucide-react';

const coverageHighlights = [
  {
    label: 'General Liability',
    description: 'Protects against bodily injury or property damage claims on active sites.',
  },
  {
    label: 'Workers’ Compensation',
    description: 'Ensures injured workers receive medical and wage benefits.',
  },
  {
    label: 'Equipment & Builder’s Risk',
    description: 'Covers owned and rented equipment plus in-progress structures.',
  },
];

export default function InsuranceSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      setSuccess(null);
      return;
    }
    setIsSubmitting(true);
    try {
      // In a future iteration this will call an API to notify the super-admin team.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccess('Request sent. Our insurance desk will follow up within one business day.');
      setMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8 shadow-lg shadow-blue-900/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              <ShieldCheck className="h-4 w-4" />
              Managed Insurance Program
            </div>
            <h1 className="text-2xl font-semibold text-white">
              View & Request Insurance Coverage Updates
            </h1>
            <p className="text-sm text-slate-300">
              Coverage is centrally administered by the SiteSafe insurance desk. You can
              review program details, download certificates, and request changes. All carrier
              connections remain secured by the super-admin team.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Need immediate proof?</p>
            <p>Contact insurance@sitesafe.ai or call (555) 010-4242 for rush endorsements.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Coverage Highlights</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your company participates in the Guardian Mutual Risk Alliance bundle. Coverage
            auto-renews annually unless you request changes.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {coverageHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white">Certificates & Proof</h3>
          <p className="mt-2 text-sm text-slate-400">
            Request COIs and endorsements directly from the SiteSafe insurance desk. Uploaded
            proof of compliance appears below.
          </p>
          <div className="mt-4 space-y-3">
            <Link
              href="/storage/insurance/sample-coi.pdf"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-900/90 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-300" />
                Certificate of Insurance (Sample)
              </span>
              <span className="text-xs text-slate-500">Updated 2 days ago</span>
            </Link>
            <Link
              href="/storage/insurance/sample-binder.pdf"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-900/90 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-300" />
                Builder’s Risk Binder (Sample)
              </span>
              <span className="text-xs text-slate-500">Updated 1 week ago</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white">Covered Worksites</h3>
          <p className="mt-2 text-sm text-slate-400">
            Coverage applies to active worksites connected to SiteSafe. Archived sites are
            retained for seven years for claims history and audit purposes.
          </p>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Downtown Tower Expansion', status: 'Active' },
              { name: 'Riverfront Warehouse Upgrade', status: 'Active' },
              { name: 'Tri-county Logistics Hub', status: 'Completed' },
            ].map((site) => (
              <div
                key={site.name}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-300" />
                  {site.name}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    site.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {site.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Request Update</h3>
          <p className="mt-2 text-sm text-slate-400">
            Need to add a project, adjust limits, or request an endorsement? Leave a note for
            the SiteSafe insurance desk.
          </p>
          <div className="mt-4 space-y-3">
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setSuccess(null);
              }}
              placeholder="Provide details about your request..."
              className="h-32 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Submit request
                </>
              )}
            </button>
            {success && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                {success}
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

