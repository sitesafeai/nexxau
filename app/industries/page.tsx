'use client';

import Link from 'next/link';
import { BuildingOfficeIcon, WrenchScrewdriverIcon, TruckIcon, BoltIcon, FireIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/navigation';

const stats = [
  { id: 1, name: 'Safety Violations Reduced', value: '83%' },
  { id: 2, name: 'ROI on Safety Investment', value: '1:6' },
  { id: 3, name: 'Cost Savings', value: '$2.4M' },
  { id: 4, name: 'Fall-Related Accidents Reduced', value: '96%' },
];

const industries = [
  {
    name: 'Construction',
    description: 'Transform construction site safety with AI-powered monitoring and real-time hazard detection.',
    icon: BuildingOfficeIcon,
    color: 'bg-orange-500',
    href: '/industries/construction',
    features: [
      'Real-time site monitoring',
      'PPE compliance tracking',
      'Equipment safety checks',
      'Worker safety alerts'
    ],
    benefits: [
      '83% reduction in safety violations',
      '96% fewer fall-related accidents',
      '30% fewer injuries with AI prediction',
      '50% lower injury-related costs'
    ]
  },
  {
    name: 'Manufacturing',
    description: 'Enhance manufacturing safety with automated monitoring and predictive analytics.',
    icon: WrenchScrewdriverIcon,
    color: 'bg-blue-500',
    href: '/industries/manufacturing',
    features: [
      'Machine safety monitoring',
      'Production line safety',
      'Worker protection systems',
      'Automated compliance'
    ],
    benefits: [
      '83% reduction in safety violations',
      '40% boost in EHS productivity',
      '15% lower insurance premiums',
      '50% reduction in injury costs'
    ]
  },
  {
    name: 'Oil & Gas',
    description: 'Ensure critical safety in oil and gas operations with advanced monitoring systems.',
    icon: FireIcon,
    color: 'bg-red-500',
    href: '/industries/oil-and-gas',
    features: [
      'Drilling safety monitoring',
      'Pipeline integrity checks',
      'Hazardous material tracking',
      'Emergency response systems'
    ],
    benefits: [
      '83% reduction in safety violations',
      '30% fewer injuries with AI prediction',
      '50% lower injury-related costs',
      '40% boost in EHS productivity'
    ]
  },
  {
    name: 'Logistics',
    description: 'Optimize logistics safety with comprehensive fleet and warehouse monitoring.',
    icon: TruckIcon,
    color: 'bg-purple-500',
    href: '/industries/logistics',
    features: [
      'Fleet safety monitoring',
      'Warehouse safety systems',
      'Route optimization',
      'Driver safety tracking'
    ],
    benefits: [
      '83% reduction in safety violations',
      '96% fewer fall-related accidents',
      '15% lower insurance premiums',
      '40% boost in EHS productivity'
    ]
  },
  {
    name: 'Energy',
    description: 'Protect critical energy infrastructure with advanced safety monitoring.',
    icon: BoltIcon,
    color: 'bg-yellow-500',
    href: '/industries/energy',
    features: [
      'Infrastructure monitoring',
      'Hazard detection',
      'Emergency response',
      'Safety compliance'
    ],
    benefits: [
      '83% reduction in safety violations',
      '30% fewer injuries with AI prediction',
      '50% lower injury-related costs',
      '40% boost in EHS productivity'
    ]
  }
];

export default function IndustriesPage() {
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
              Industries We Serve
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              SiteSafe's AI-powered safety solutions are tailored for high-risk industries that demand the highest standards of safety and compliance. Our technology helps you protect your workforce, reduce costs, and maintain regulatory compliance.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Schedule a Demo
              </Link>
              <Link href="#industries" className="text-sm font-semibold leading-6 text-gray-900">
                Explore Industries <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-24 sm:py-32">
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

      {/* Industries Grid */}
      <div id="industries" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Comprehensive Safety Solutions</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tailored for Your Industry
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Each industry faces unique safety challenges. Our solutions are specifically designed to address your sector's specific needs and requirements.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map((industry) => (
                <div
                  key={industry.name}
                  className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200 hover:ring-blue-500 transition-all duration-300"
                >
                  <div className="flex flex-col h-full">
                    <div className={`${industry.color} p-4 rounded-xl mb-6 w-fit`}>
                      <industry.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{industry.name}</h3>
                    <p className="text-base text-gray-600 mb-6">{industry.description}</p>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Features</h4>
                        <ul className="space-y-3">
                          {industry.features.map((feature) => (
                            <li key={feature} className="flex items-center text-sm text-gray-600">
                              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Benefits</h4>
                        <ul className="space-y-3">
                          {industry.benefits.map((benefit) => (
                            <li key={benefit} className="flex items-center text-sm text-gray-600">
                              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <Link
                        href={industry.href}
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Learn more <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 