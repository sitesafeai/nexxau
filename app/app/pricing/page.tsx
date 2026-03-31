import type { Metadata } from 'next';
import { CheckCircle } from 'lucide-react';
import MarketingNavbar from '../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Simple, Transparent Pricing | Nexxau',
  description: 'Nexxau pricing: per worksite, per camera, and enterprise options. Transparent pricing for construction and industrial safety monitoring.',
  keywords: ['safety monitoring pricing', 'PPE compliance software pricing', 'construction safety software cost'],
  openGraph: {
    title: 'Simple, Transparent Pricing | Nexxau',
    description: 'Nexxau pricing: per worksite, per camera, and enterprise options.',
    url: 'https://nexxau.com/pricing',
  },
  alternates: {
    canonical: 'https://nexxau.com/pricing',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Choose the pricing model that works for your organization. All plans include full functionality, real-time detection, and compliance reporting.
            </p>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Per Worksite */}
              <div className="bg-[#1e3a5f] rounded-lg p-8 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4">Per Worksite</h2>
                <p className="text-3xl font-bold text-blue-400 mb-2">Custom</p>
                <p className="text-sm text-[#8b9bb1] mb-6">Pricing based on site size and complexity</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Unlimited cameras per site</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Real-time detection and alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Compliance reporting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Video evidence logging</span>
                  </li>
                </ul>
                <Link href="/contact/sales" className="block w-full text-center px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                  Get Exact Pricing
                </Link>
              </div>

              {/* Per Camera */}
              <div className="bg-[#1e3a5f] rounded-lg p-8 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4">Per Camera</h2>
                <p className="text-3xl font-bold text-blue-400 mb-2">Custom</p>
                <p className="text-sm text-[#8b9bb1] mb-6">Pricing per camera per month</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Scalable pricing model</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Real-time detection and alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Compliance reporting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Video evidence logging</span>
                  </li>
                </ul>
                <Link href="/contact/sales" className="block w-full text-center px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                  Get Exact Pricing
                </Link>
              </div>

              {/* Enterprise */}
              <div className="bg-[#1e3a5f] rounded-lg p-8 border border-blue-500/50">
                <h2 className="text-2xl font-bold text-white mb-4">Enterprise</h2>
                <p className="text-3xl font-bold text-blue-400 mb-2">Custom</p>
                <p className="text-sm text-[#8b9bb1] mb-6">Multi-site deployments and custom requirements</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Unlimited sites and cameras</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Custom integrations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Dedicated support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">SLA guarantees</span>
                  </li>
                </ul>
                <Link href="/contact/sales" className="block w-full text-center px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                  Get Exact Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Get Exact Pricing for Your Site</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">Contact us for a custom quote based on your site size, number of cameras, and specific requirements.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Get Exact Pricing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

