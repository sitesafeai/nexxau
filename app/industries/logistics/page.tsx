'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TruckIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Navbar from '@/src/components/Navbar';

export default function LogisticsPage() {
  const router = useRouter();

  return (
    <div className="bg-white">
      <Navbar />
      
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Industries
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-100/20">
        {/* Background image with overlay */}
        <div className="absolute inset-0 -z-10 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10" />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.1),rgba(255,255,255,0))]" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 transform-gpu blur-3xl" aria-hidden="true">
            <div className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
          </div>
          <div className="absolute -bottom-40 -left-40 transform-gpu blur-3xl" aria-hidden="true">
            <div className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#4f46e5] to-[#80caff] opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Logistics Safety Solutions
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Optimize logistics safety with Nexxau's comprehensive fleet and warehouse monitoring solutions. Our AI-powered platform helps you maintain the highest safety standards across your entire supply chain.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Schedule a Demo
              </Link>
              <Link href="#features" className="text-sm font-semibold leading-6 text-gray-900">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-4">
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-gray-600">Safety Violations Reduced</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-blue-600 sm:text-5xl">83%</dd>
            </div>
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-gray-600">ROI on Safety Investment</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-blue-600 sm:text-5xl">1:6</dd>
            </div>
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-gray-600">Cost Savings</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-blue-600 sm:text-5xl">$2.4M</dd>
            </div>
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-gray-600">Fall-Related Accidents Reduced</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-blue-600 sm:text-5xl">96%</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Comprehensive Safety Solutions</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to ensure safety in logistics operations
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered platform provides comprehensive safety monitoring and compliance solutions specifically designed for the logistics industry.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
                <div className="absolute -right-4 -top-4 text-4xl">🚚</div>
                <h3 className="text-xl font-semibold text-gray-900">Fleet Safety Monitoring</h3>
                <p className="mt-4 text-gray-600">
                  Real-time monitoring of vehicle conditions and cargo security with instant alerts for potential safety issues.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
                <div className="absolute -right-4 -top-4 text-4xl">🏭</div>
                <h3 className="text-xl font-semibold text-gray-900">Warehouse Safety</h3>
                <p className="mt-4 text-gray-600">
                  Automated monitoring of warehouse operations, equipment usage, and personnel safety compliance.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
                <div className="absolute -right-4 -top-4 text-4xl">📊</div>
                <h3 className="text-xl font-semibold text-gray-900">Safety Analytics</h3>
                <p className="mt-4 text-gray-600">
                  Comprehensive safety insights and reporting to identify patterns and prevent incidents before they occur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your logistics safety standards?
            <br />
            Start using Nexxau today.
          </h2>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/contact"
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get started
            </Link>
            <Link href="/pricing" className="text-sm font-semibold leading-6 text-white">
              View pricing <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 