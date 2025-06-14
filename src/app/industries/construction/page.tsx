import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheckIcon, ChartBarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'AI-Powered Safety Solutions for Construction | SiteSafe',
  description: 'Transform construction site safety with SiteSafe\'s AI-powered monitoring. Reduce accidents, ensure compliance, and protect your workforce with real-time safety solutions.',
  keywords: 'construction safety, AI safety monitoring, construction site safety, safety compliance, construction risk management',
};

const features = [
  {
    name: 'Real-time Monitoring',
    description: '24/7 AI-powered surveillance of construction sites to identify potential hazards before they become incidents.',
    icon: ClockIcon,
  },
  {
    name: 'Compliance Tracking',
    description: 'Automated tracking of safety protocols, PPE usage, and regulatory compliance requirements.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Risk Analytics',
    description: 'Advanced analytics to identify patterns and predict potential safety risks before they occur.',
    icon: ChartBarIcon,
  },
  {
    name: 'Emergency Response',
    description: 'Instant alerts and rapid response coordination in case of safety incidents or emergencies.',
    icon: ExclamationTriangleIcon,
  },
];

const benefits = [
  {
    title: 'Reduced Accidents',
    description: 'Our AI system has helped construction companies reduce workplace accidents by up to 75%.',
    stat: '75%',
  },
  {
    title: 'Cost Savings',
    description: 'Lower insurance premiums and reduced downtime through proactive safety measures.',
    stat: '$2.5M',
  },
  {
    title: 'Compliance Rate',
    description: 'Maintain 99.9% compliance with safety regulations and standards.',
    stat: '99.9%',
  },
];

export default function ConstructionPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-100/20">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AI-Powered Safety Solutions for Construction
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Transform your construction site safety with our advanced AI monitoring system. 
              Protect your workforce, ensure compliance, and reduce accidents with real-time safety solutions.
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
            <h2 className="text-base font-semibold leading-7 text-blue-600">Advanced Safety Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to ensure construction site safety
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered safety system provides comprehensive monitoring and protection for your construction sites.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
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

      {/* Benefits Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Proven Results</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Transform your construction safety metrics
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex flex-col">
                  <dt className="text-4xl font-bold tracking-tight text-blue-600">{benefit.stat}</dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="font-semibold text-gray-900">{benefit.title}</p>
                    <p className="mt-2 flex-auto">{benefit.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your construction site safety?
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