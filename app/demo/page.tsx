'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/src/components/home/Footer';
import Link from 'next/link';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-4">Watch a Demo</h1>
          <p className="mt-2 text-lg text-gray-300 mb-2">
            See how SiteSafe works in action. Explore our demo videos to understand the platform's features and user experience.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            *Disclaimer: The following demo videos are from a third-party platform. SiteSafe will look and function almost identically, but some branding and minor details may differ.
          </p>
        </div>
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Video 1 */}
          <div className="aspect-w-16 aspect-h-9 w-full">
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Demo Video 1"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg w-full h-64 md:h-72"
            ></iframe>
            <p className="mt-2 text-gray-300 text-sm">Demo 1: Platform Overview</p>
          </div>
          {/* Video 2 */}
          <div className="aspect-w-16 aspect-h-9 w-full">
            <iframe
              src="https://www.youtube.com/embed/9bZkp7q19f0"
              title="Demo Video 2"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg w-full h-64 md:h-72"
            ></iframe>
            <p className="mt-2 text-gray-300 text-sm">Demo 2: Real-Time Safety Monitoring</p>
          </div>
          {/* Video 3 */}
          <div className="aspect-w-16 aspect-h-9 w-full">
            <iframe
              src="https://www.youtube.com/embed/tgbNymZ7vqY"
              title="Demo Video 3"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg w-full h-64 md:h-72"
            ></iframe>
            <p className="mt-2 text-gray-300 text-sm">Demo 3: Incident Reporting</p>
          </div>
          {/* Video 4 */}
          <div className="aspect-w-16 aspect-h-9 w-full">
            <iframe
              src="https://www.youtube.com/embed/oHg5SJYRHA0"
              title="Demo Video 4"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg w-full h-64 md:h-72"
            ></iframe>
            <p className="mt-2 text-gray-300 text-sm">Demo 4: Analytics & Reporting</p>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Link href="/contact/sales">
            <button className="mt-8 rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              Contact Sales
            </button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
} 