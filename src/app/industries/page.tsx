import { Metadata } from 'next';
import Link from 'next/link';
import { BuildingOfficeIcon, WrenchScrewdriverIcon, TruckIcon, BoltIcon, FireIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Industries We Serve | SiteSafe - AI-Powered Safety Solutions',
  description: 'Discover how SiteSafe\'s AI-powered safety solutions are tailored for high-risk industries. From construction to energy, we provide comprehensive safety monitoring and compliance solutions.',
  keywords: 'construction safety, manufacturing safety, oil and gas safety, logistics safety, energy safety, industrial safety solutions, workplace safety, safety compliance',
};

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
      '75% reduction in safety incidents',
      '90% faster hazard detection',
      '50% lower insurance costs',
      '100% compliance tracking'
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
      '60% fewer workplace accidents',
      '85% faster incident response',
      '40% reduction in downtime',
      'Real-time safety analytics'
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
      '80% reduction in safety incidents',
      '95% faster emergency response',
      '70% lower compliance costs',
      '24/7 critical monitoring'
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
      '65% fewer accidents',
      '90% faster incident response',
      '45% lower insurance costs',
      'Real-time fleet monitoring'
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
      '70% reduction in incidents',
      '85% faster response times',
      '60% lower maintenance costs',
      'Predictive safety analytics'
    ]
  }
];

const stats = [
  { id: 1, name: 'Safety Incidents Reduced', value: '75%' },
  { id: 2, name: 'Response Time Improved', value: '90%' },
  { id: 3, name: 'Compliance Rate', value: '99.9%' },
  { id: 4, name: 'Cost Savings', value: '$2.5M' },
];

export default function IndustriesPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-100/20">
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
                              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-auto pt-6">
                      <Link
                        href={industry.href}
                        className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500"
                      >
                        Learn more about {industry.name}
                        <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your industry's safety standards?
            <br />
            Start using SiteSafe today.
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