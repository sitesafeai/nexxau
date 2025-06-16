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
            See how Nexxau works in action. Explore our demo videos to understand the platform's features and user experience.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            *Disclaimer: The following demo videos are from a third-party platform. Nexxau will look and function almost identically, but some branding and minor details may differ.
          </p>
        </div>
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Video 1: fast-machine-demo.mov */}
          <div className="aspect-w-16 aspect-h-9 w-full rounded-lg overflow-hidden">
            <video
              src="/fast-machine-demo.mov"
              title="Fast Machine Demo"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            ></video>
            <p className="mt-2 text-gray-300 text-sm">Demo 1: Fast Machine Operations</p>
          </div>
          {/* Video 2: forklift-close-call.mov */}
          <div className="aspect-w-16 aspect-h-9 w-full rounded-lg overflow-hidden">
            <video
              src="/forklift-close-call.mov"
              title="Forklift Close Call"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            ></video>
            <p className="mt-2 text-gray-300 text-sm">Demo 2: Forklift Close Call</p>
          </div>
          {/* Video 3: worker-posture-danger.mov */}
          <div className="aspect-w-16 aspect-h-9 w-full rounded-lg overflow-hidden">
            <video
              src="/worker-posture-danger.mov"
              title="Worker Posture Danger"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            ></video>
            <p className="mt-2 text-gray-300 text-sm">Demo 3: Worker Posture Danger</p>
          </div>
          {/* Video 4: forklift-danger-preview.mov */}
          <div className="aspect-w-16 aspect-h-9 w-full rounded-lg overflow-hidden">
            <video
              src="/forklift-danger-preview.mov"
              title="Forklift Danger Preview"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            ></video>
            <p className="mt-2 text-gray-300 text-sm">Demo 4: Forklift Danger Preview</p>
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