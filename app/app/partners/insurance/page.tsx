'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { 
  ShieldCheckIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentCheckIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  TruckIcon,
  CogIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const benefits = [
  {
    name: 'Reduced Claims',
    description: 'Help your clients prevent accidents before they happen with proactive safety monitoring.',
    icon: ShieldCheckIcon,
    color: 'bg-green-500',
    stats: '40% reduction in claims'
  },
  {
    name: 'Lower Premiums',
    description: 'Enable data-driven pricing with comprehensive safety analytics and risk assessment.',
    icon: CurrencyDollarIcon,
    color: 'bg-blue-500',
    stats: '15% average premium reduction'
  },
  {
    name: 'Faster Claims Processing',
    description: 'Streamline claims with detailed incident documentation and automated reporting.',
    icon: ClockIcon,
    color: 'bg-purple-500',
    stats: '60% faster processing'
  },
  {
    name: 'Better Risk Assessment',
    description: 'Get real-time insights into client safety performance for more accurate underwriting.',
    icon: ChartBarIcon,
    color: 'bg-orange-500',
    stats: 'Real-time risk scoring'
  }
];

const industries = [
  {
    name: 'Construction',
    icon: BuildingOfficeIcon,
    color: 'bg-orange-500',
    riskFactors: ['Falls from height', 'Equipment accidents', 'PPE violations'],
    solutions: ['Fall detection', 'Equipment monitoring', 'PPE compliance tracking']
  },
  {
    name: 'Manufacturing',
    icon: CogIcon,
    color: 'bg-blue-500',
    riskFactors: ['Machine accidents', 'Chemical exposure', 'Ergonomic injuries'],
    solutions: ['Machine safety monitoring', 'Chemical spill detection', 'Posture analysis']
  },
  {
    name: 'Logistics',
    icon: TruckIcon,
    color: 'bg-purple-500',
    riskFactors: ['Vehicle accidents', 'Loading injuries', 'Warehouse falls'],
    solutions: ['Driver behavior monitoring', 'Loading safety checks', 'Warehouse monitoring']
  },
  {
    name: 'Energy',
    icon: BoltIcon,
    color: 'bg-yellow-500',
    riskFactors: ['Electrical hazards', 'Fire risks', 'Equipment failures'],
    solutions: ['Electrical safety monitoring', 'Fire detection', 'Predictive maintenance']
  }
];

const features = [
  {
    name: 'Real-time Risk Monitoring',
    description: 'Monitor client safety performance in real-time with AI-powered analytics.',
    icon: ExclamationTriangleIcon,
    benefits: [
      'Instant safety violation detection',
      'Predictive risk modeling',
      'Automated alert systems',
      'Comprehensive safety scoring'
    ]
  },
  {
    name: 'Claims Documentation',
    description: 'Automated incident documentation with detailed video evidence and safety analysis.',
    icon: DocumentCheckIcon,
    benefits: [
      'Video evidence capture',
      'Automated incident reports',
      'Safety violation tracking',
      'Compliance documentation'
    ]
  },
  {
    name: 'Client Safety Programs',
    description: 'Help your clients implement effective safety programs with data-driven insights.',
    icon: UserGroupIcon,
    benefits: [
      'Safety training recommendations',
      'Performance benchmarking',
      'Best practice sharing',
      'Continuous improvement tracking'
    ]
  }
];

export default function InsurancePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Insurance Solutions
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Partner with Nexxau to reduce claims, lower premiums, and provide better risk assessment for your clients. Our AI-powered safety monitoring helps you protect your portfolio while improving client safety outcomes.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Partner with Us
              </Link>
              <Link href="#benefits" className="text-sm font-semibold leading-6 text-white">
                Learn More <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div id="benefits" className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Insurance Benefits</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Transform Your Insurance Business
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Leverage AI-powered safety monitoring to reduce risk, improve client relationships, and increase profitability.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit.name} className="flex flex-col bg-gray-700 rounded-2xl p-8 border border-gray-600">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <div className={`${benefit.color} p-3 rounded-lg`}>
                      <benefit.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {benefit.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                    <p className="flex-auto">{benefit.description}</p>
                    <p className="mt-4 text-lg font-semibold text-blue-400">{benefit.stats}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Industries Section */}
      <div className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">High-Risk Industries</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Protect Your High-Risk Clients
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our solutions are specifically designed for industries with the highest safety risks and insurance costs.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {industries.map((industry) => (
                <div key={industry.name} className="flex flex-col bg-gray-800 rounded-2xl p-6 border border-gray-700">
                  <div className={`${industry.color} p-3 rounded-lg w-fit mb-4`}>
                    <industry.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-4">{industry.name}</h3>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">Key Risk Factors</h4>
                    <ul className="space-y-1">
                      {industry.riskFactors.map((factor) => (
                        <li key={factor} className="text-xs text-gray-300">• {factor}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-auto">
                    <h4 className="text-sm font-semibold text-green-400 mb-2">Our Solutions</h4>
                    <ul className="space-y-1">
                      {industry.solutions.map((solution) => (
                        <li key={solution} className="text-xs text-gray-300">• {solution}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Insurance Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Comprehensive Insurance Solutions
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Everything you need to better serve your clients and reduce your risk exposure.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col bg-gray-700 rounded-2xl p-8 border border-gray-600">
                  <div className="flex items-center gap-4 mb-6">
                    <feature.icon className="h-8 w-8 text-blue-400" aria-hidden="true" />
                    <h3 className="text-xl font-semibold text-white">{feature.name}</h3>
                  </div>
                  <p className="text-gray-300 mb-6">{feature.description}</p>
                  <div className="mt-auto">
                    <h4 className="text-sm font-semibold text-blue-400 mb-4">Key Benefits:</h4>
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-gray-300">
                          <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                          <span className="text-sm">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Transform Your Insurance Business?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Join leading insurance companies who trust Nexxau to reduce claims and improve client safety outcomes.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Partner with Us
              </Link>
              <Link href="/demo" className="text-sm font-semibold leading-6 text-white">
                Schedule Demo <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 