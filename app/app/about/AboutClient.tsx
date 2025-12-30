'use client';

import React from 'react';
import { ShieldCheckIcon, EyeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../components/MarketingNavbar';

const principles = [
  {
    name: 'Prevention Over Paperwork',
    description: 'We build tools that stop incidents, not tools that document them after the fact.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Field-First Design',
    description: 'Every feature is shaped by safety managers and site crews, not by engineers guessing what works.',
    icon: EyeIcon,
  },
  {
    name: 'Measurable Results',
    description: 'If we can\'t measure it — detection accuracy, response time, violation trends — we don\'t ship it.',
    icon: ChartBarIcon,
  },
];

export default function AboutClient() {
  return (
    <div className="min-h-screen bg-gray-900">
      <MarketingNavbar variant="dark" />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              We Build Safety Technology That Actually Works on Jobsites
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Computer vision for high-risk industries. Designed to prevent incidents — not just document them.
            </p>
          </div>
        </div>
      </div>

      {/* The Story - Condensed */}
      <div className="bg-gray-800 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">The Origin</h2>
                <p className="text-gray-300 mb-4">
                  We started with a question: why is the same AI powering self-driving cars not protecting frontline workers?
                </p>
                <p className="text-gray-300 mb-4">
                  Construction, manufacturing, oil & gas — the industries with the highest fatality rates were still relying on clipboards and monthly audits.
                </p>
                <p className="text-gray-300">
                  We built Nexxau to change that. A prototype for hardhat detection became a platform that now monitors zones, tracks violations, and feeds data directly to insurers.
                </p>
            </div>
              <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Where We Are Now</h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">→</span>
                    <span>Pilot-ready for construction, manufacturing, and logistics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">→</span>
                    <span>Insurance partnership integrations in development</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">→</span>
                    <span>Based in Miami, serving U.S. and LATAM</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">→</span>
                    <span>Enrolling early partners for 30-day pilots</span>
                  </li>
                </ul>
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* Principles - Just 3 */}
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-white mb-10 text-center">What We Stand On</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {principles.map((principle) => (
                <div key={principle.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <principle.icon className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">{principle.name}</h3>
                  <p className="text-sm text-gray-400">{principle.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mission + Vision Combined */}
      <div className="bg-gray-800 py-16 border-t border-gray-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white mb-6">What We're Building Toward</h2>
            <p className="text-lg text-gray-300 mb-8">
              A future where every high-risk site runs with live safety intelligence. Where violations are caught before they become injuries. Where insurers have real data instead of guesswork.
            </p>
            <p className="text-gray-400">
              Our success isn't measured in features shipped. It's measured in incidents prevented.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Want to See It Work?</h2>
            <p className="text-gray-400 mb-8">30-minute demo. Real detection. Your questions answered.</p>
            <Link href="/contact/sales" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
