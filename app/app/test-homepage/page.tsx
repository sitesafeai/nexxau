import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import HowItWorks from '@/components/home/HowItWorks';
import Industries from '@/components/home/Industries';
import Stats from '@/components/home/Stats';
import FAQ from '@/components/home/FAQ';
import { ShieldCheckIcon, ChartBarIcon, BellIcon, CameraIcon, ExclamationTriangleIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { Metadata } from 'next';

const features = [
  {
    name: 'Real-time Monitoring',
    description: '24/7 AI-powered surveillance that instantly detects safety violations and potential hazards.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Compliance Tracking',
    description: 'Automated tracking of safety compliance metrics and instant reporting for regulatory requirements.',
    icon: ChartBarIcon,
  },
  {
    name: 'Team Management',
    description: 'Manage safety training, certifications, and access control for your entire workforce.',
    icon: BellIcon,
  },
];

const stats = [
  {
    name: '60% Reduction in Safety Incidents',
    description: 'Companies using Nexxau have seen a dramatic decrease in workplace accidents and near-misses.',
    icon: ExclamationTriangleIcon,
  },
  {
    name: '95% Compliance Rate',
    description: 'Our AI system ensures near-perfect adherence to safety protocols and regulatory requirements.',
    icon: CheckCircleIcon,
  },
  {
    name: '24/7 Automated Monitoring',
    description: 'Round-the-clock surveillance that never misses a safety violation or potential hazard.',
    icon: CameraIcon,
  },
];

const steps = [
  {
    name: '1. Install Cameras',
    description: 'Set up our AI-powered cameras in strategic locations around your site.',
    icon: CameraIcon,
  },
  {
    name: '2. Configure Rules',
    description: 'Define your safety protocols and compliance requirements in our system.',
    icon: ShieldCheckIcon,
  },
  {
    name: '3. Monitor & Improve',
    description: 'Get real-time alerts and insights to continuously improve safety.',
    icon: ChartBarIcon,
  },
];

export const metadata: Metadata = {
  title: 'Nexxau | AI-Powered Site Safety Platform',
  description: 'Transform your site safety with Nexxau. AI-powered monitoring, real-time alerts, compliance tracking, and comprehensive reporting for modern construction sites.',
};

export default function TestHomepage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex items-center">
        {/* Background with gradient */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.1),rgba(255,255,255,0))]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="block">Transform Your</span>
                <span className="block text-blue-400">Site Safety</span>
              </h1>
              <p className="mt-6 text-xl text-gray-300 max-w-2xl">
                AI-powered safety monitoring that protects your workers and reduces risk. 
                Real-time alerts, compliance tracking, and comprehensive reporting for modern construction sites.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Talk to Our Team
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-white/10 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Watch Demo
                </Link>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="relative bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <feature.icon className="h-8 w-8 text-blue-400" aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-white">{feature.name}</h3>
                  </div>
                  <p className="mt-4 text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <Stats />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Industries Section */}
      <Industries />

      {/* Visual Divider */}
      <div className="relative bg-gray-900">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-gray-800" />
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-center gap-8 py-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Proven Impact Section */}
      <div className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Proven Impact</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Trusted by leading construction companies
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our AI-powered platform has helped construction companies reduce safety incidents and improve compliance.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <stat.icon className="h-5 w-5 flex-none text-blue-400" aria-hidden="true" />
                    {stat.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                    <p className="flex-auto">{stat.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />

      {/* CTA Section */}
      <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your site safety?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Join leading construction companies that trust Nexxau to protect their workers and improve compliance.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get started
              </Link>
              <Link href="/demo" className="text-sm font-semibold leading-6 text-white">
                Watch demo <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8">
              <div className="text-2xl font-bold text-white">Nexxau</div>
              <p className="text-sm leading-6 text-gray-300">
                AI-powered safety monitoring that protects your workers and reduces risk. Real-time alerts, compliance tracking, and comprehensive reporting for modern construction sites.
              </p>
              <div className="flex space-x-6">
                <Link href="#" className="text-gray-400 hover:text-gray-300">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-gray-300">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">Solutions</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link href="/industries/construction" className="text-sm leading-6 text-gray-300 hover:text-white">Construction</Link>
                    </li>
                    <li>
                      <Link href="/industries/manufacturing" className="text-sm leading-6 text-gray-300 hover:text-white">Manufacturing</Link>
                    </li>
                    <li>
                      <Link href="/industries/logistics" className="text-sm leading-6 text-gray-300 hover:text-white">Logistics</Link>
                    </li>
                    <li>
                      <Link href="/industries/energy" className="text-sm leading-6 text-gray-300 hover:text-white">Energy</Link>
                    </li>
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-white">Company</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link href="/about" className="text-sm leading-6 text-gray-300 hover:text-white">About</Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-sm leading-6 text-gray-300 hover:text-white">Contact</Link>
                    </li>
                    <li>
                      <Link href="/features" className="text-sm leading-6 text-gray-300 hover:text-white">Features</Link>
                    </li>
                    <li>
                      <Link href="/technology" className="text-sm leading-6 text-gray-300 hover:text-white">Technology</Link>
                    </li>
                    <li>
                      <Link href="/demo" className="text-sm leading-6 text-gray-300 hover:text-white">Demo</Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">Support</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link href="/help" className="text-sm leading-6 text-gray-300 hover:text-white">Help Center</Link>
                    </li>
                    <li>
                      <Link href="/contact/sales" className="text-sm leading-6 text-gray-300 hover:text-white">Contact Sales</Link>
                    </li>
                    <li>
                      <Link href="/help" className="text-sm leading-6 text-gray-300 hover:text-white">Training</Link>
                    </li>
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-white">Legal</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <li>
                      <Link href="/privacy" className="text-sm leading-6 text-gray-300 hover:text-white">Privacy</Link>
                    </li>
                    <li>
                      <Link href="/terms" className="text-sm leading-6 text-gray-300 hover:text-white">Terms</Link>
                    </li>
                    <li>
                      <Link href="/help" className="text-sm leading-6 text-gray-300 hover:text-white">Security</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-gray-700 pt-8">
            <p className="text-xs leading-5 text-gray-400">&copy; 2024 Nexxau. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
