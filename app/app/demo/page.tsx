import type { Metadata } from 'next';
import { VideoCameraIcon, ExclamationTriangleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../components/MarketingNavbar';

export const metadata: Metadata = {
  title: 'See Nexxau in Action | Demo',
  description: 'Watch example demonstrations of Nexxau safety monitoring: real-time detection, alert systems, and dashboard analytics.',
  keywords: ['safety monitoring demo', 'PPE detection demo', 'construction safety demo'],
  openGraph: {
    title: 'See Nexxau in Action | Demo',
    description: 'Watch example demonstrations of Nexxau safety monitoring: real-time detection, alert systems, and dashboard analytics.',
    url: 'https://nexxau.com/demo',
  },
  alternates: {
    canonical: 'https://nexxau.com/demo',
  },
};

export default function DemoPage() {
  const demoFeatures = [
    {
      name: 'Example Detection',
      description: 'Example of how our AI detects safety violations in real-time.',
      icon: VideoCameraIcon,
      color: 'bg-blue-500',
      label: 'Sample Detection',
    },
    {
      name: 'Sample Alert',
      description: 'Example of how instant alerts are triggered and delivered to safety managers.',
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      label: 'Mock Alert',
    },
    {
      name: 'Mock Violation Log',
      description: 'Example of the analytics and reporting dashboard.',
      icon: ChartBarIcon,
      color: 'bg-green-500',
      label: 'Example Report',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              See Nexxau in Action
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Example demonstrations of how Nexxau detects violations, sends alerts, and helps prevent accidents.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact/sales"
                className="px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm"
              >
                Schedule Live Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Main Demo Example */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Platform Overview
              </h2>
              <p className="text-lg text-[#8b9bb1]">
                Example overview of how Nexxau works in construction environments.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-[#1e3a5f] border border-white/10 aspect-video flex items-center justify-center">
              <div className="text-center">
                <VideoCameraIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Example Video Feed</p>
                <p className="text-sm text-[#8b9bb1]">Mock camera feed showing detection capabilities</p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Features */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Key Features</h2>
              <p className="text-lg text-[#8b9bb1]">
                Example demonstrations of each component of our safety monitoring system.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {demoFeatures.map((feature) => (
                <div key={feature.name} className="flex flex-col bg-[#1e3a5f] rounded-lg p-8 border border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${feature.color} p-3 rounded-lg`}>
                      <feature.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{feature.name}</h3>
                  </div>
                  <p className="text-[#8b9bb1] mb-6">{feature.description}</p>
                  
                  <div className="relative rounded-xl overflow-hidden bg-[#0d1f35] border border-white/10 aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <feature.icon className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                      <p className="text-white text-sm font-semibold mb-1">{feature.label}</p>
                      <p className="text-xs text-[#8b9bb1]">Example visualization</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready for a Live Demo?</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Schedule a personalized demo with our team and see how Nexxau can transform safety at your organization.
            </p>
            <Link
              href="/contact/sales"
              className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm"
            >
              Schedule Live Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
