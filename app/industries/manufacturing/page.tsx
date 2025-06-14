'use client';

import Link from 'next/link';
import { WrenchScrewdriverIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Navbar from '../../components/Navbar';
import { useRouter } from 'next/navigation';

export default function ManufacturingPage() {
  const router = useRouter();

  return (
    <div className="bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-100/20">
        {/* Background image with overlay */}
        <div className="absolute inset-0 -z-10 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10" />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.1),rgba(255,255,255,0))]" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <Link
                href="/industries"
                className="inline-flex space-x-6"
              >
                <span className="rounded-full bg-blue-600/10 px-3 py-1 text-sm font-semibold leading-6 text-blue-600 ring-1 ring-inset ring-blue-600/10">
                  Back to Industries
                </span>
              </Link>
            </div>
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Manufacturing Safety Solutions
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Enhance manufacturing safety with automated monitoring and predictive analytics. Our AI-powered solutions help you reduce incidents, improve compliance, and protect your workforce.
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

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Manufacturing Safety</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Comprehensive Safety Solutions
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered safety solutions are specifically designed for manufacturing environments, helping you maintain the highest standards of safety and compliance.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon className="h-5 w-5 flex-none text-blue-600" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="mx-auto flex max-w-xs flex-col gap-y-4">
                <dt className="text-base leading-7 text-gray-600">{stat.name}</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-blue-600 sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Transform Your Manufacturing Safety?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Join leading manufacturers who trust SiteSafe to protect their workforce and maintain compliance.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get started
              </Link>
              <Link href="/demo" className="text-sm font-semibold leading-6 text-white">
                Watch demo <span aria-hidden="true">→</span>
              </Link>
            </div>
            <svg
              viewBox="0 0 1024 1024"
              className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
              aria-hidden="true"
            >
              <circle cx={512} cy={512} r={512} fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)" fillOpacity="0.7" />
              <defs>
                <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
                  <stop stopColor="#7775D6" />
                  <stop offset={1} stopColor="#E935C1" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    name: 'Machine Safety Monitoring',
    description: 'Real-time monitoring of machine operations to detect potential hazards and prevent accidents.',
    icon: WrenchScrewdriverIcon,
  },
  {
    name: 'Production Line Safety',
    description: 'Comprehensive safety monitoring for production lines, ensuring worker protection and operational efficiency.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Worker Protection Systems',
    description: 'Advanced systems to protect workers from hazards and ensure proper safety protocols are followed.',
    icon: ChartBarIcon,
  },
  {
    name: 'Automated Compliance',
    description: 'Automated tracking and reporting of safety compliance to meet industry standards and regulations.',
    icon: ClockIcon,
  },
];

const stats = [
  { id: 1, name: 'Safety Violations Reduced', value: '83%' },
  { id: 2, name: 'ROI on Safety Investment', value: '1:6' },
  { id: 3, name: 'Cost Savings', value: '$2.4M' },
  { id: 4, name: 'Fall-Related Accidents Reduced', value: '96%' },
]; 