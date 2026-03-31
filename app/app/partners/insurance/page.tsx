'use client';

import React from 'react';
import { ChartBarIcon, DocumentCheckIcon, ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import MarketingNavbar from '../../components/MarketingNavbar';

export default function InsurancePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <MarketingNavbar variant="dark" />

      {/* Hero */}
      <div className="relative pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Safety Data for Smarter Underwriting
            </h1>
            <p className="mt-6 text-lg text-gray-300">
              Live violation data. Video evidence. Risk scoring. Everything insurers need to price accurately and resolve claims faster.
            </p>
            <div className="mt-8">
              <Link href="/contact/sales" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                Request Partnership Info
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Three Pillars - Clean */}
      <div className="bg-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Underwriting */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <ChartBarIcon className="h-10 w-10 text-blue-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Underwriting</h3>
              <p className="text-gray-400 mb-6">Objective safety scores based on actual site behavior, not self-reported audits.</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Site-level violation frequency</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Contractor comparison scoring</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Risk trend modeling</li>
              </ul>
            </div>

            {/* Claims */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <DocumentCheckIcon className="h-10 w-10 text-blue-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Claims Investigation</h3>
              <p className="text-gray-400 mb-6">Video evidence and violation history that accelerate claims resolution.</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Timestamped video evidence</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Pre-incident violation timeline</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Zone-entry logs</li>
              </ul>
            </div>

            {/* Loss Prevention */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
              <ShieldCheckIcon className="h-10 w-10 text-blue-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Loss Prevention</h3>
              <p className="text-gray-400 mb-6">Identify clients with rising risk before claims spike.</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Escalation alerts for at-risk sites</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Pattern detection (time, contractor, zone)</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />Intervention recommendations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data Available */}
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">What Data You Get</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Violation Data</h3>
                <p className="text-sm text-gray-400">PPE violations, zone breaches, unsafe proximity — with timestamps, severity, and frequency trends.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Evidence Package</h3>
                <p className="text-sm text-gray-400">Video clips, incident timelines, zone-entry logs — structured for claims adjusters.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Risk Metrics</h3>
                <p className="text-sm text-gray-400">Site scores, contractor rankings, compliance consistency — ready for actuarial models.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">API Access</h3>
                <p className="text-sm text-gray-400">RESTful API with webhooks. JSON payloads. Scheduled exports in your preferred format.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-800 py-16 border-t border-gray-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">See the Data in Action</h2>
            <p className="text-gray-400 mb-8">We'll show you exactly what violation data, risk scores, and evidence packages look like.</p>
            <Link href="/contact/sales" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
