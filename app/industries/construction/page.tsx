import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { BuildingOfficeIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon, VideoCameraIcon, WrenchScrewdriverIcon, BellAlertIcon, BanknotesIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Construction Industry Solutions | Nexxau',
  description: 'Transform construction site safety with AI-powered monitoring and real-time hazard detection. Reduce incidents by 75% and improve response time by 90%.',
};

const stats = [
  { id: 1, name: 'Safety Violations Reduced', value: '83%' },
  { id: 2, name: 'ROI on Safety Investment', value: '1:6' },
  { id: 3, name: 'Cost Savings', value: '$2.4M' },
  { id: 4, name: 'Fall-Related Accidents Reduced', value: '96%' },
];

const features = [
  {
    name: 'Real-time Site Monitoring',
    description: '24/7 AI-powered monitoring of construction sites to detect safety hazards and violations in real-time.',
    icon: VideoCameraIcon,
  },
  {
    name: 'PPE Compliance Tracking',
    description: 'Automated detection of PPE usage and compliance across all workers on site.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Equipment Safety Checks',
    description: 'Continuous monitoring of equipment safety and maintenance status to prevent accidents.',
    icon: WrenchScrewdriverIcon,
  },
  {
    name: 'Worker Safety Alerts',
    description: 'Instant alerts for potential safety hazards and violations to prevent accidents before they happen.',
    icon: BellAlertIcon,
  },
];

const benefits = [
  {
    name: 'Reduced Safety Violations',
    description: '83% reduction in safety violations through AI-powered monitoring and real-time intervention.',
    icon: ChartBarIcon,
  },
  {
    name: 'Lower Insurance Costs',
    description: '15% reduction in insurance premiums through improved safety records and risk management.',
    icon: BanknotesIcon,
  },
  {
    name: 'Increased Productivity',
    description: '40% boost in EHS productivity through automated safety monitoring and reporting.',
    icon: ClockIcon,
  },
  {
    name: 'Fewer Accidents',
    description: '96% reduction in fall-related accidents and 30% fewer injuries through predictive AI.',
    icon: ShieldCheckIcon,
  },
];

export default function ConstructionPage() {
  return (
    <div className="bg-white">
      <Navbar />
      
      {/* Hero Section with enhanced background */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="absolute inset-0 -z-10 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.1),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Construction Safety Solutions
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Transform your construction site safety with AI-powered monitoring and real-time hazard detection. Our technology helps you protect your workforce, reduce costs, and maintain regulatory compliance.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Schedule a Demo
              </Link>
              <Link href="#features" className="text-sm font-semibold leading-6 text-gray-900">
                Learn More <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section with enhanced background */}
      <div className="relative bg-white py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.05),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
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

      {/* Features Section with enhanced background */}
      <div className="relative bg-gray-50 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.05),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Comprehensive Safety Solutions</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to ensure construction site safety
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered solutions are specifically designed for the construction industry, addressing your unique safety challenges and requirements.
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

      {/* Benefits Section with enhanced background */}
      <div className="relative bg-white py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.05),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Proven Results</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Transform Your Safety Performance
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered safety solutions have delivered measurable results for construction companies worldwide.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {benefits.map((benefit) => (
                <div key={benefit.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <benefit.icon className="h-5 w-5 flex-none text-blue-600" aria-hidden="true" />
                    {benefit.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{benefit.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section with enhanced background */}
      <div className="relative bg-blue-600">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(255,255,255,0.1),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your construction site safety?
            <br />
            Start using Nexxau today.
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