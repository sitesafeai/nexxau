import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import { ShieldCheckIcon, ChartBarIcon, CogIcon, ArrowPathIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Risk Reduction',
    description: 'Proactively identify and mitigate safety risks before they result in claims, reducing your exposure and improving loss ratios.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Data-Driven Insights',
    description: 'Access comprehensive analytics and reporting tools to better understand risk patterns and make informed underwriting decisions.',
    icon: ChartBarIcon,
  },
  {
    name: 'Customizable Solutions',
    description: 'Tailor our platform to your specific needs with flexible integration options and customizable risk assessment parameters.',
    icon: CogIcon,
  },
  {
    name: 'Real-Time Monitoring',
    description: 'Monitor safety conditions in real-time, enabling proactive intervention and reducing the likelihood of incidents.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Client Success',
    description: 'Help your clients improve their safety performance, leading to better retention and stronger relationships.',
    icon: UserGroupIcon,
  },
];

const metrics = [
  { id: 1, stat: '30%', label: 'Average reduction in workplace incidents' },
  { id: 2, stat: '45%', label: 'Decrease in safety-related claims' },
  { id: 3, stat: '60%', label: 'Faster incident response time' },
  { id: 4, stat: '85%', label: 'Client satisfaction rate' },
];

const integrationSteps = [
  {
    id: 1,
    name: 'Assessment',
    description: 'We evaluate your current risk management processes and identify integration opportunities.',
  },
  {
    id: 2,
    name: 'Customization',
    description: 'Tailor our platform to your specific needs and risk assessment criteria.',
  },
  {
    id: 3,
    name: 'Integration',
    description: 'Seamlessly integrate with your existing systems and workflows.',
  },
  {
    id: 4,
    name: 'Training',
    description: 'Comprehensive training for your team and client support.',
  },
  {
    id: 5,
    name: 'Launch',
    description: 'Go live with your customized safety monitoring solution.',
  },
];

export default function InsurancePartners() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.1),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
          <div className="px-6 lg:px-0 lg:pt-4">
            <div className="mx-auto max-w-2xl">
              <div className="max-w-lg">
                <h1 className="mt-10 text-4xl font-bold tracking-tight text-white sm:text-6xl">
                  Transform Your Risk Management with SiteSafe
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                  Partner with us to revolutionize how you manage risk, reduce claims, and protect your clients. Our AI-powered safety monitoring platform helps you stay ahead of risks and build stronger client relationships.
                </p>
                <div className="mt-10 flex items-center gap-x-6">
                  <Link
                    href="/contact/sales"
                    className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Schedule a Demo
                  </Link>
                  <Link href="#features" className="text-sm font-semibold leading-6 text-white">
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div id="features" className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-400">Why Partner With Us</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to enhance your risk management
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Our platform is designed to help insurance companies reduce risk, improve client relationships, and make data-driven decisions.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                  <feature.icon className="h-5 w-5 flex-none text-blue-400" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Stats section */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Software Trusted By Leading Insurance Companies
              </h2>
              <p className="mt-4 text-lg leading-8 text-gray-300">
                Our platform is designed to help insurance companies reduce risk and improve safety outcomes
              </p>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.id} className="flex flex-col bg-gray-400/5 p-8">
                  <dt className="text-sm font-semibold leading-6 text-gray-300">{item.label}</dt>
                  <dd className="order-first text-3xl font-semibold tracking-tight text-white">{item.stat}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Integration Process</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Simple, seamless integration
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our team will guide you through every step of the integration process, ensuring a smooth transition to enhanced risk management.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-5">
              {integrationSteps.map((step) => (
                <div key={step.id} className="flex flex-col">
                  <dt className="text-base font-semibold leading-7 text-white">
                    {step.id}. {step.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                    <p className="flex-auto">{step.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="relative isolate overflow-hidden bg-gray-800 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your risk management?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Schedule a demo to see how SiteSafe can help you reduce risk, improve client relationships, and make data-driven decisions.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact/sales"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Schedule a Demo
              </Link>
              <Link href="/contact/sales" className="text-sm font-semibold leading-6 text-white">
                Contact Sales <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 