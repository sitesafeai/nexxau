'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { 
  PlayIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  VideoCameraIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const demoFeatures = [
  {
    name: 'Real-time Detection',
    description: 'Watch our AI detect safety violations in real-time as they happen.',
    icon: VideoCameraIcon,
    color: 'bg-blue-500',
    video: '/demo-third-aprty-sitesafe.mov'
  },
  {
    name: 'Alert System',
    description: 'See how instant alerts are triggered and delivered to safety managers.',
    icon: ExclamationTriangleIcon,
    color: 'bg-red-500',
    video: '/fast-machine-demo.mov'
  },
  {
    name: 'Dashboard Analytics',
    description: 'Explore the comprehensive analytics and reporting dashboard.',
    icon: ChartBarIcon,
    color: 'bg-green-500',
    video: '/demo-third-aprty-sitesafe.mov'
  },
  {
    name: 'Mobile App',
    description: 'Experience the mobile app for on-the-go safety management.',
    icon: DevicePhoneMobileIcon,
    color: 'bg-purple-500',
    video: '/fast-machine-demo.mov'
  }
];

const benefits = [
  {
    name: '83% Reduction in Safety Violations',
    description: 'Companies using Nexxau have seen dramatic improvements in safety compliance.',
    icon: ShieldCheckIcon,
    color: 'bg-green-500'
  },
  {
    name: 'Real-time Response',
    description: 'Get notified instantly when safety violations are detected.',
    icon: ClockIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'Comprehensive Reporting',
    description: 'Detailed analytics and reports for safety performance tracking.',
    icon: ChartBarIcon,
    color: 'bg-purple-500'
  }
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              See Nexxau in Action
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Watch our AI-powered safety monitoring system detect violations, send alerts, and help prevent accidents in real-time.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact/sales"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Schedule Live Demo
              </Link>
              <Link href="#demo-videos" className="text-sm font-semibold leading-6 text-white">
                Watch Videos <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Demo Video */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Platform Overview
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Get a comprehensive overview of how Nexxau works in real-world construction environments.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-gray-700 border border-gray-600">
              <video
                className="w-full h-auto"
                autoPlay
                loop
                muted
                playsInline
                poster="/demo-third-aprty-sitesafe.mov"
              >
                <source src="/demo-third-aprty-sitesafe.mov" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Features */}
      <div id="demo-videos" className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Key Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Explore Our Platform
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              See how each component of our safety monitoring system works together to protect your workers.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {demoFeatures.map((feature) => (
                <div key={feature.name} className="flex flex-col bg-gray-800 rounded-2xl p-8 border border-gray-700">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${feature.color} p-3 rounded-lg`}>
                      <feature.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{feature.name}</h3>
                  </div>
                  <p className="text-gray-300 mb-6">{feature.description}</p>
                  
                  <div className="relative rounded-xl overflow-hidden bg-gray-700 border border-gray-600">
                    <video
                      className="w-full h-auto"
                      autoPlay
                      loop
                      muted
                      playsInline
                      poster={feature.video}
                    >
                      <source src={feature.video} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Proven Results</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Real Impact, Real Results
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              See how companies are achieving measurable improvements in safety with Nexxau.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.name} className="flex flex-col bg-gray-700 rounded-2xl p-8 border border-gray-600">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${benefit.color} p-3 rounded-lg`}>
                      <benefit.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{benefit.name}</h3>
                  </div>
                  <p className="text-gray-300">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo CTA */}
      <div className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready for a Live Demo?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Schedule a personalized demo with our team and see how Nexxau can transform safety at your organization.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact/sales"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Schedule Live Demo
              </Link>
              <Link href="/technology" className="text-sm font-semibold leading-6 text-white">
                Learn About Our Technology <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-x-6 text-sm">
              <Link href="/help" className="text-gray-300 hover:text-white">
                Read User Guide <span aria-hidden="true">→</span>
              </Link>
              <Link href="/technology#api-docs" className="text-gray-300 hover:text-white">
                View API Docs <span aria-hidden="true">→</span>
              </Link>
              <Link href="/demo" className="text-gray-300 hover:text-white">
                Watch Videos <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 