'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/home/Footer';
import { 
  ShieldCheckIcon, 
  ChartBarIcon, 
  BellIcon, 
  CameraIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  ChartPieIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Real-time Safety Monitoring',
    description: '24/7 AI-powered surveillance that instantly detects safety violations and potential hazards on your construction site.',
    longDescription: 'Our advanced computer vision system continuously monitors your site, identifying safety violations in real-time. From missing PPE to unsafe work practices, our AI instantly detects and alerts you to potential hazards before they become incidents.',
    icon: CameraIcon,
    benefits: [
      'Instant detection of safety violations',
      '24/7 automated monitoring',
      'Reduced response time to hazards',
      'Proactive safety management'
    ]
  },
  {
    name: 'Compliance Tracking',
    description: 'Automated tracking of safety compliance metrics and instant reporting for regulatory requirements.',
    longDescription: 'Stay ahead of compliance requirements with our comprehensive tracking system. Automatically monitor and document safety protocols, training certifications, and regulatory compliance. Generate detailed reports for audits and inspections with just a few clicks.',
    icon: DocumentCheckIcon,
    benefits: [
      'Automated compliance documentation',
      'Real-time compliance status',
      'Customizable reporting',
      'Regulatory requirement tracking'
    ]
  },
  {
    name: 'Nexxau Copilot',
    description: 'Your AI assistant for smarter safety management, from creating alerts to actionable feedback.',
    longDescription: 'Nexxau Copilot is your intelligent AI assistant designed to help you manage site safety with ease. Copilot can create custom alerts, analyze your site data, and provide actionable feedback such as identifying the most dangerous worksites, the most frequently repeated alerts, and more. It empowers you to make data-driven decisions and continuously improve safety outcomes.',
    icon: ShieldCheckIcon,
    benefits: [
      'AI-powered alert creation',
      'Feedback on most dangerous worksites',
      'Insights on most repeated alerts',
      'Personalized safety recommendations',
      'Continuous improvement suggestions'
    ]
  },
  {
    name: 'Analytics Dashboard',
    description: 'Comprehensive analytics and insights to improve safety performance and reduce incidents.',
    longDescription: 'Make data-driven safety decisions with our powerful analytics dashboard. Track safety metrics, identify trends, and measure the effectiveness of your safety programs. Visualize your safety data with interactive charts and reports.',
    icon: ChartPieIcon,
    benefits: [
      'Real-time safety metrics',
      'Trend analysis',
      'Customizable dashboards',
      'Performance benchmarking'
    ]
  },
  {
    name: 'Mobile Alerts',
    description: 'Instant notifications and alerts delivered to your mobile device for immediate response.',
    longDescription: 'Never miss a safety incident with our mobile alert system. Receive instant notifications about safety violations, compliance issues, or potential hazards. Respond quickly with our mobile app, which allows you to acknowledge, document, and resolve issues on the go.',
    icon: DevicePhoneMobileIcon,
    benefits: [
      'Real-time mobile notifications',
      'Quick response capabilities',
      'Mobile incident documentation',
      'On-the-go safety management'
    ]
  },
  {
    name: 'Cloud Storage',
    description: 'Secure cloud storage for all safety documentation, incident reports, and compliance records.',
    longDescription: 'Keep all your safety documentation secure and easily accessible with our cloud storage solution. Store incident reports, safety audits, training records, and compliance documentation in one secure location. Access your safety records from anywhere, anytime.',
    icon: CloudIcon,
    benefits: [
      'Secure document storage',
      'Easy access to records',
      'Automated backups',
      'Version control'
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Powerful Features for Modern Safety
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Discover how Nexxau's comprehensive suite of features can transform your construction site safety management.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.name} className="flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <feature.icon className="h-8 w-8 text-blue-400" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-white">{feature.name}</h3>
              </div>
              <p className="text-gray-300 mb-6">{feature.longDescription}</p>
              <div className="mt-auto">
                <h4 className="text-sm font-semibold text-blue-400 mb-4">Key Benefits:</h4>
                <ul className="space-y-3">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-gray-300">
                      <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Transform Your Site Safety?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Join leading construction companies who trust Nexxau to protect their workers and improve compliance.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get Started
              </Link>
              <Link href="/demo" className="text-sm font-semibold leading-6 text-white">
                Watch Demo <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
} 