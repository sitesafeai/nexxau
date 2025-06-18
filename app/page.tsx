'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Industries from '@/src/components/home/Industries';
import FAQ from '@/src/components/home/FAQ';
import Footer from '@/src/components/home/Footer';
import ConversionFooter from '@/src/components/home/ConversionFooter';
import Navbar from '@/src/components/Navbar';
import Features from '@/src/components/home/Features';
import WhoItsFor from '@/src/components/home/WhoItsFor';
import Impact from '@/src/components/home/Impact';
import SiteStats from '@/src/components/home/SiteStats';
import { ShieldCheckIcon, ChartBarIcon, BellIcon, CameraIcon, ExclamationTriangleIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import HowItWorks from '@/src/components/home/HowItWorks';
import { CloudinaryImage } from './lib/cloudinary';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

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

export default function HomePage() {
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

      {/* Features Section */}
      <Features />

      {/* Who It's For Section */}
      <WhoItsFor />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Industries Section */}
      <Industries />

      {/* FAQ Section */}
      <FAQ />

      {/* Conversion Footer */}
      <ConversionFooter />

      {/* Footer */}
      <Footer />
    </div>
  );
}
