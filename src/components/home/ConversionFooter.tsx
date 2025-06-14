'use client';

import Link from 'next/link';

export default function ConversionFooter() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gray-900 p-8 sm:p-12">
          {/* Background Gradient */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
          
          <div className="relative">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Transform Your Safety Management?
          </h2>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Join leading companies in revolutionizing workplace safety with AI-powered monitoring and prevention.
          </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
                  href="/contact"
                  className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-300"
            >
                  Get Started
            </Link>
                <Link
                  href="/demo"
                  className="text-lg font-semibold leading-6 text-white hover:text-blue-400 transition-colors duration-300"
                >
                  Request Demo <span aria-hidden="true">→</span>
            </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 