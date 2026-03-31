import type { Metadata } from 'next';
import { FireIcon, ShieldCheckIcon, ChartBarIcon, BellAlertIcon, ExclamationTriangleIcon, BeakerIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Oil & Gas Safety Monitoring with AI Detection | Nexxau',
  description: 'Oil and gas safety monitoring with automated FR clothing detection, H2S zone monitoring, and gas detection zone compliance. Reduce oil & gas safety violations by 80%+.',
  keywords: ['oil and gas safety monitoring', 'oil gas safety software', 'H2S zone monitoring', 'FR clothing detection'],
  openGraph: {
    title: 'Oil & Gas Safety Monitoring with AI Detection | Nexxau',
    description: 'Oil and gas safety monitoring with automated FR clothing detection, H2S zone monitoring, and gas detection zone compliance.',
    url: 'https://nexxau.com/industries/oil-and-gas',
  },
  alternates: {
    canonical: 'https://nexxau.com/industries/oil-and-gas',
  },
};

export default function OilAndGasPage() {
  return (
    <div className="bg-[#0a1628] min-h-screen">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Oil & Gas Safety Monitoring with AI Detection
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Oil and gas facilities have unique hazards: fire and explosion risks, H2S exposure, gas detection zone violations, and flame-resistant clothing compliance failures. Manual supervision can't monitor every zone, every worker, every moment. Nexxau provides 24/7 automated monitoring using your existing cameras.
            </p>
          </div>
        </section>

        {/* Oil & Gas Hazards */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Oil & Gas Facility Hazards</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <FireIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Fire & Explosion Risks</h3>
                <p className="text-sm text-[#8b9bb1]">Workers without flame-resistant clothing in areas with fire risks. FR clothing detection ensures compliance with safety protocols.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <BeakerIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">H2S Exposure</h3>
                <p className="text-sm text-[#8b9bb1]">Workers entering H2S zones without proper authorization or detection equipment. Zone breach detection monitors H2S areas.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Gas Detection Zone Violations</h3>
                <p className="text-sm text-[#8b9bb1]">Workers entering gas detection zones without proper authorization. Zone monitoring ensures compliance.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ShieldCheckIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Heavy Equipment Proximity</h3>
                <p className="text-sm text-[#8b9bb1]">Workers too close to operating heavy equipment. High-visibility vest detection helps prevent struck-by incidents.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Nexxau Features for Oil & Gas */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">How Nexxau Maps to Oil & Gas Risks</h2>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <BellAlertIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Flame-Resistant Clothing Compliance</h3>
                  <p className="text-[#8b9bb1]">Detects workers without FR clothing in areas with fire and explosion risks. Ensures compliance with safety protocols.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">H2S Zone Entry Detection</h3>
                  <p className="text-[#8b9bb1]">Monitors H2S zones for unauthorized entry. Alerts supervisors when workers enter H2S areas without proper authorization.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ChartBarIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Gas Detection Zone Compliance</h3>
                  <p className="text-[#8b9bb1]">Monitors gas detection zones for unauthorized entry. Ensures workers follow safety protocols before entering hazardous areas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FireIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Heavy Equipment Proximity Monitoring</h3>
                  <p className="text-[#8b9bb1]">Monitors workers in areas with heavy equipment. High-visibility vest detection helps prevent struck-by incidents.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Request Industry Demo</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">See how Nexxau monitors oil and gas facilities with industry-specific detection rules.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request Industry Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
